import User from '~/models/schemas/User.schema'
import databaseService from './database.services'
import { RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken, verifyToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { config } from 'dotenv'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '~/constants/messages'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import { Follower } from '~/models/schemas/Followers.schema'
import axios from 'axios'
config()

class UsersService {
  private decodeRefreshToken(refresh_token: string) {
    //hàm nhận vào token và secretOrPublicKey sẽ return về payload
    return verifyToken({
      token: refresh_token,
      secretOrPublicKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
    })
  }

  private signAccessToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // để khi kí tên thì có thể biết được chủ ký đó của ai
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken, verify },
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
    })
  }

  private signRefreshToken({ user_id, verify, exp }: { user_id: string; verify: UserVerifyStatus; exp?: number }) {
    // để khi kí tên thì có thể biết được chủ ký đó của ai
    if (exp) {
      return signToken({
        payload: { user_id, token_type: TokenType.RefreshToken, verify, exp },
        privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string //thêm
      })
    } else {
      return signToken({
        payload: { user_id, token_type: TokenType.RefreshToken, verify },
        options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN },
        privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
      })
    }
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
    const { iat, exp } = await this.decodeRefreshToken(refresh_token)
    //lưu refresh_token vào database
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id),
        iat,
        exp
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
    const { iat, exp } = await this.decodeRefreshToken(refresh_token)
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id),
        iat,
        exp
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
    const { iat, exp } = await this.decodeRefreshToken(refresh_token)
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id), // muốn lưu lên db thì phải ép kiểu lên object
        iat,
        exp
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

  async follow(user_id: string, followed_user_id: string) {
    //kiểm tra xem đã follow hay chưa
    const isFollowed = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    //nếu đã follow thì return message là đã follow
    if (isFollowed != null) {
      return {
        message: USERS_MESSAGES.FOLLOWED // trong message.ts thêm FOLLOWED: 'Followed'
      }
    }
    //chưa thì thêm 1 document vào collection followers
    await databaseService.followers.insertOne(
      new Follower({
        user_id: new ObjectId(user_id),
        followed_user_id: new ObjectId(followed_user_id)
      })
    )
    return {
      message: USERS_MESSAGES.FOLLOW_SUCCESS //trong message.ts thêm   FOLLOW_SUCCESS: 'Follow success'
    }
  }

  async unfollow(user_id: string, followed_user_id: string) {
    //kiểm tra xem đã follow hay chưa
    const isFollowed = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })

    //nếu chưa follow thì return message là "đã unfollow trước đó" luôn
    if (isFollowed == null) {
      return {
        message: USERS_MESSAGES.ALREADY_UNFOLLOWED // trong message.ts thêm ALREADY_UNFOLLOWED: 'Already unfollowed'
      }
    }

    //nếu đang follow thì tìm và xóa document đó
    await databaseService.followers.deleteOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })

    //nếu xóa thành công thì return message là unfollow success
    return {
      message: USERS_MESSAGES.UNFOLLOW_SUCCESS // trong message.ts thêm UNFOLLOW_SUCCESS: 'Unfollow success'
    }
  }

  async changePassword(user_id: string, password: string) {
    //tìm user thông qua user_id
    //cập nhật lại password và forgot_password_token
    //tất nhiên là lưu password đã hash rồi
    // ko cần await cũng được
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          password: hashPassword(password),
          forgot_password_token: '',
          updated_at: '$$NOW'
        }
      }
    ])
    //nếu bạn muốn ngta đổi mk xong tự động đăng nhập luôn thì trả về access_token và refresh_token
    //ở đây mình chỉ cho ngta đổi mk thôi, nên trả về message
    return {
      message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS // trong message.ts thêm CHANGE_PASSWORD_SUCCESS: 'Change password success'
    }
  }

  async refreshToken({
    user_id,
    verify,
    refresh_token,
    exp
  }: {
    user_id: string
    verify: UserVerifyStatus
    refresh_token: string
    exp: number
  }) {
    //tạo mới
    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken({ user_id, verify }),
      this.signRefreshToken({ user_id, verify, exp })
    ])

    const { iat } = await this.decodeRefreshToken(new_refresh_token)

    //vì một người đăng nhập ở nhiều nơi khác nhau, nên họ sẽ có rất nhiều document trong collection refreshTokens
    //ta không thể dùng user_id để tìm document cần update, mà phải dùng token, đọc trong RefreshToken.schema.ts

    //----------------------------------------------------------------------------------------------------------
    await databaseService.refreshTokens.deleteOne({ token: refresh_token }) //xóa refresh
    //insert lại document mới
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: new_refresh_token, iat, exp })
    )
    return { access_token, refresh_token: new_refresh_token }
  }

  //getOAuthGoogleToken dùng code nhận đc để yêu cầu google tạo id_token
  private async getOAuthGoogleToken(code: string) {
    const body = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID, //khai báo trong .env bằng giá trị trong file json
      client_secret: process.env.GOOGLE_CLIENT_SECRET, //khai báo trong .env bằng giá trị trong file json
      redirect_uri: process.env.GOOGLE_REDIRECT_URI, //khai báo trong .env bằng giá trị trong file json
      grant_type: 'authorization_code'
    }
    //giờ ta gọi api của google, truyền body này lên để lấy id_token
    //ta dùng axios để gọi api `npm i axios`
    const { data } = await axios.post(`https://oauth2.googleapis.com/token`, body, {
      headers: {
        'Content-Type': 'application/json' //kiểu truyền lên là form (x-www-form-urlencoded)
      }
    }) //nhận đc response nhưng đã rã ra lấy data
    return data as {
      access_token: string
      id_token: string
    }
  }

  //dùng id_token để lấy thông tin của người dùng
  private async getGoogleUserInfo(access_token: string, id_token: string) {
    const { data } = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo`, {
      params: {
        access_token,
        alt: 'json'
      },
      headers: {
        Authorization: `Bearer ${id_token}`
      }
    })
    //ta chỉ lấy những thông tin cần thiết
    return data as {
      id: string
      email: string
      email_verified: boolean
      name: string
      given_name: string
      family_name: string
      picture: string
      locale: string
    }
  }

  async oAuth(code: string) {
    const { access_token, id_token } = await this.getOAuthGoogleToken(code)
    const userInfor = await this.getGoogleUserInfo(access_token, id_token)
    //userInfor giống payload mà ta đã check jwt ở trên
    if (!userInfor.email_verified) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGES.GMAIL_NOT_VERIFIED, // trong message.ts thêm GMAIL_NOT_VERIFIED: 'Gmail not verified'
        status: HTTP_STATUS.BAD_REQUEST //thêm trong HTTP_STATUS BAD_REQUEST:400
      })
    }
    //kiểm tra email đã đăng ký lần nào chưa bằng checkEmailExist đã viết ở trên
    const user = await databaseService.users.findOne({ email: userInfor.email })
    //nếu tồn tại thì cho login vào, tạo access và refresh token
    if (user) {
      const [access_token, refresh_token] = await this.signAccessTokenAndsignRefreshToken({
        user_id: user._id.toString(),
        verify: user.verify
      })
      //thêm user_id và verify
      //thêm refresh token vào database
      const { iat, exp } = await this.decodeRefreshToken(refresh_token)
      await databaseService.refreshTokens.insertOne(
        new RefreshToken({ user_id: user._id, token: refresh_token, iat, exp })
      )
      return {
        access_token,
        refresh_token,
        new_user: 0, //đây là user cũ
        verify: user.verify
      }
    } else {
      //random string password
      const password = Math.random().toString(36).slice(1, 15) //substring(1, 15)
      //chưa tồn tại thì cho tạo mới, hàm register(đã viết trước đó) trả về access và refresh token
      const data = await this.register({
        email: userInfor.email,
        name: userInfor.name,
        password: password,
        confirm_password: password,
        date_of_birth: new Date().toISOString()
      })
      return {
        ...data,
        new_user: 1, //đây là user mới
        verify: UserVerifyStatus.Unverified
      }
    }
  }
}

const usersService = new UsersService()
export default usersService
