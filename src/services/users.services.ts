import User from '~/models/schemas/User.schema'
import databaseService from './database.services'
import { RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.request'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { config } from 'dotenv'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '~/constants/messages'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
config()

class UsersService {
  private signAccessToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // để khi kí tên thì có thể biết được chủ ký đó của ai
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken, verify },
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
    })
  }

  private signRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // để khi kí tên thì có thể biết được chủ ký đó của ai
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken, verify },
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
    })
  }

  //hàm signEmailVerifyToken
  private signEmailVerifyToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // để khi kí tên thì có thể biết được chủ ký đó của ai
    return signToken({
      payload: { user_id, token_type: TokenType.EmailVerificationToken, verify },
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
    })
  }

  private signForgotPasswordToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // để khi kí tên thì có thể biết được chủ ký đó của ai
    return signToken({
      payload: { user_id, token_type: TokenType.ForgotPasswordToken, verify },
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
    })
  }

  //ký access_token và refesh_token
  private signAccessTokenAndsignRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return Promise.all([this.signAccessToken({ user_id, verify }), this.signRefreshToken({ user_id, verify })])
  }

  async checkEmailExist(email: string) {
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }

  async register(payload: RegisterReqBody) {
    // định nghĩa thẳng luôn để có đủ các thuộc tính để tạo đối tượng user
    //payload là dữ liệu được đưa lên đưa về
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified //0
    })
    const result = await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
        username: `user${user_id.toString()}`,
        email_verify_token,
        // tại vì thg User đã có date_of_birth rồi nên h cần overide lại
        date_of_birth: new Date(payload.date_of_birth),
        // ko thể tồn tại 2 thuộc tính date_of_birth
        password: hashPassword(payload.password)
        // mã hóa password
      })
    )
    // laasy usser id từ account vừa tạo bằng cách
    // từ user_id tạo ra 1 access token và 1 refresh token
    const [access_token, refresh_token] = await this.signAccessTokenAndsignRefreshToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified //0 chưa đăng kí nên chưa xác thực hay ktra
    })
    //lưu refresh_token vào database
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    //nếu có tiền ở đây dùng aws hoặc ses thì gửi mail mới được
    // bây giờ ko có chỉ giả lập gửi mail
    console.log(email_verify_token)

    return { access_token, refresh_token }
  }
  // cách tìm id bằng token qua mongoDB
  //{_id: ObjectId('6531412daccdb52cb23acb65')}

  async login({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    //dùng user_id tạo access_token và refesh_token
    const [access_token, refresh_token] = await this.signAccessTokenAndsignRefreshToken({ user_id, verify })
    //lưu refresh_token vào database
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    return { access_token, refresh_token }
  }

  async logout(refresh_token: string) {
    //dùng refresh_token tìm và xóa
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    return {
      message: USERS_MESSAGES.LOGOUT_SUCCESS
    }
  }

  async verifyEmail(user_id: string) {
    //update lại user
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          verify: UserVerifyStatus.Verified,
          email_verify_token: '',
          updated_at: '$$NOW' // $$NOW lấy thời gian thực trên mongoDB
        }
      }
    ])

    // tạo ra access và refresh token
    const [access_token, refresh_token] = await this.signAccessTokenAndsignRefreshToken({
      user_id,
      verify: UserVerifyStatus.Verified
    })
    //lưu refresh_token vào db
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id) // muốn lưu lên db thì phải ép kiểu lên object
      })
    )
    return { access_token, refresh_token }
  }

  async resendEmailVerify(user_id: string) {
    //tạo ra  email_verify_token
    const email_verify_token = await this.signEmailVerifyToken({
      user_id,
      verify: UserVerifyStatus.Unverified
    })
    //update lại user
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          email_verify_token,
          updated_at: '$$NOW'
        }
      }
    ])

    // giả lậpk
    console.log(email_verify_token)
    return { message: USERS_MESSAGES.RESEND_EMAIL_VERIFY_SUCCESS } //Resend email verify success
  }

  async forgotPassword({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // tạo forgot_password_token
    const forgot_password_token = await this.signForgotPasswordToken({ user_id, verify })
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          forgot_password_token,
          updated_at: '$$NOW'
        }
      }
    ])
    console.log(forgot_password_token)
    return { message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD }
  }

  async resetPassword({ user_id, password }: { user_id: string; password: string }) {
    //dùng cái user_id đó tìm user và update lại password
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          forgot_password_token: '',
          password: hashPassword(password),
          updated_at: '$$NOW'
        }
      }
    ])
    return {
      message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
    }
  }

  async getMe(user_id: string) {
    const user = await databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
      // projection là để dấu mấy cái thuộc tính trên ko hiển thị ra màn hình
      //-> để số 0 là ko hiển thị
    )
    return user // sẽ k có những thuộc tính nêu trên, tránh bị lộ thông tin
  }

  async updateMe(user_id: string, payload: UpdateMeReqBody) {
    //dùng user_id đó để tim user và update lại password
    const _payload = payload.date_of_birth ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } : payload
    //tiến hành update
    const user = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      [
        {
          $set: {
            ..._payload,
            updated_at: '$$NOW'
          }
        }
      ],
      {
        returnDocument: 'after', // trả về document sau khi cập nhật
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    // dưới này phải bị lỗi và phải can thiệp vào thư viện của thằng findOneAndUpdate
    //Promise<ModifyResult<TSchema>> cho 2 thằng cuối dòng cuối
    return user
  }

  async getProfile(username: string) {
    const user = await databaseService.users.findOne(
      { username },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0,
          verify: 0,
          create_at: 0,
          updated_at: 0
        }
      }
    )
    if (!user) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }
    return user
  }
}

const usersService = new UsersService()
export default usersService
