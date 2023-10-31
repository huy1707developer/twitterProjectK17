import User from '~/models/schemas/User.schema'
import databaseService from './database.services'
import { RegisterReqBody } from '~/models/requests/User.request'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType } from '~/constants/enums'
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
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN }
    })
  }

  private signRefreshToken(user_id: string) {
    // để khi kí tên thì có thể biết được chủ ký đó của ai
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken },
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN }
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
    const result = await databaseService.users.insertOne(
      new User({
        ...payload,
        // tại vì thg User đã có date_of_birth rồi nên h cần overide lại
        date_of_birth: new Date(payload.date_of_birth),
        // ko thể tồn tại 2 thuộc tính date_of_birth
        password: hashPassword(payload.password)
        // mã hóa password
      })
    )
    // laasy usser id từ account vừa tạo bằng cách
    const user_id = result.insertedId.toString()
    // từ user_id tạo ra 1 access token và 1 refresh token
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
}

const usersService = new UsersService()
export default usersService
