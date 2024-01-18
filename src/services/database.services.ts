import { MongoClient, Db, Collection, ServerApiVersion } from 'mongodb'
import { config } from 'dotenv'
//để có thể dùng biến trong env
import User from '~/models/schemas/User.schema'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { Follower } from '~/models/schemas/Followers.schema'
import Tweet from '~/models/schemas/Tweet.schema'
config()

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@tweetprojectpiedteam.tr4ovqn.mongodb.net/?retryWrites=true&w=majority`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version

class DatabaseService {
  private client: MongoClient
  private db: Db
  constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.DB_NAME)
  }

  async connect() {
    try {
      await this.db.command({ ping: 1 })
      //ping là thử try cập vào database nếu truy cập thành công thì là ping: 1
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (err) {
      console.log(err)
      throw err
    }
  }

  get users(): Collection<User> {
    //
    // để khi chấm nó có thể sổ ra được các thuộc tính bên trong
    // phải mô tả thật kỹ
    return this.db.collection(process.env.DB_USERS_COLLECTION as string) //as string: mày yên tâm nó là string
    // cho nó biết chính là string
  }

  async indexUsers() {
    const exists = await this.users.indexExists([
      'username_1',
      'email_1',
      'email_1_password_1'
    ])
    if (exists) return
    // unique để tìm kiếm không trùng username và email
    await this.users.createIndex({ username: 1 }, { unique: true })
    await this.users.createIndex({ email: 1 }, { unique: true })
    await this.users.createIndex({ email: 1, password: 1 })
  }

  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKENS_COLLECTION as string)
  }

  get followers(): Collection<Follower> {
    return this.db.collection(process.env.DB_FOLLOWERS_COLLECTION as string)
  }

  async indexRefreshTokens() {
    const exists = await this.refreshTokens.indexExists(['token_1', 'exp_1'])
    if (exists) return
    this.refreshTokens.createIndex({ token: 1 })
    //đây là ttl index , sẽ tự động xóa các document khi hết hạn của exp
    this.refreshTokens.createIndex({ exp: 1 }, { expireAfterSeconds: 0 })
  }

  async indexFollowers() {
    const exists = await this.followers.indexExists(['user_id_1_followed_user_id_1'])
    if (exists) return
    this.followers.createIndex({ user_id: 1, followed_user_id: 1 })
  }

  get tweets(): Collection<Tweet> {
    return this.db.collection(process.env.DB_TWEETS_COLLECTION as string)
  }
}
const databaseService = new DatabaseService()
export default databaseService
