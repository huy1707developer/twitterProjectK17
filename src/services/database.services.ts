import { MongoClient, ServerApiVersion, Db, Collection } from 'mongodb'
import { config } from 'dotenv'
//để có thể dùng biến trong env
import User from '~/models/schemas/User.schema'
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
}
const databaseService = new DatabaseService()
export default databaseService
