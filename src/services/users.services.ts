import User from '~/models/schemas/User.schema'
import databaseService from './database.services'
import { RegisterReqBody } from '~/models/requests/User.request'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { config } from 'dotenv'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '~/constants/messages'
config()

class UsersService {
  private signAccessToken(user_id: string) {
    // để khi kí tên thì có thể biết được chủ ký đó của ai
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken },
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
    })
  }

  private signRefreshToken(user_id: string) {
    // để khi kí tên thì có thể biết được chủ ký đó của ai
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken },
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
    })
  }

  //hàm signEmailVerifyToken
  private signEmailVerifyToken(user_id: string) {
    // để khi kí tên thì có thể biết được chủ ký đó của ai
    return signToken({
      payload: { user_id, token_type: TokenType.EmailVerificationToken },
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
    })
  }

  //ký access_token và refesh_token
  private signAccessTokenAndsignRefreshToken(user_id: string) {
    return Promise.all([this.signAccessToken(user_id), this.signRefreshToken(user_id)])
  }

  async checkEmailExist(email: string) {
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }

  async register(payload: RegisterReqBody) {
    // định nghĩa thẳng luôn để có đủ các thuộc tính để tạo đối tượng user
    //payload là dữ liệu được đưa lên đưa về
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    const result = await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
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
    const [access_token, refresh_token] = await this.signAccessTokenAndsignRefreshToken(user_id.toString())
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

  async login(user_id: string) {
    //dùng user_id tạo access_token và refesh_token
    const [access_token, refresh_token] = await this.signAccessTokenAndsignRefreshToken(user_id)
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
    const [access_token, refresh_token] = await this.signAccessTokenAndsignRefreshToken(user_id)
    //lưu refresh_token vào db
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id) // muốn lưu lên db thì phải ép kiểu lên object
      })
    )
    return { access_token, refresh_token }
  }
}

const usersService = new UsersService()
export default usersService
