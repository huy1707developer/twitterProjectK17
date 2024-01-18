// đây là để kí tên
import { config } from 'dotenv'
import jwt from 'jsonwebtoken'
import { TokenPayload } from '~/models/requests/User.requests'
config()

export const signToken = ({
  payload,
  privateKey,
  options = { algorithm: 'HS256' }
}: {
  payload: string | object | Buffer
  privateKey: string
  options?: jwt.SignOptions
}) => {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, privateKey, options, (error, token) => {
      if (error) throw reject(error)
      resolve(token as string)
    })
  })
}

// hàm kiểm tra token có phải của server tạo ra không
// nếu có thì trả ra payload
// tại vì nếu định nghĩa trong khung đầu{} luôn luôn thì ko thể để gái trị default được nên phải code theo cách dưới
export const verifyToken = ({
  token,
  secretOrPublicKey // đây là giá trị default như đã nói -> vì thế nên code thao cách này
}: {
  token: string
  secretOrPublicKey: string
}) => {
  return new Promise<TokenPayload>((resolve, reject) => {
    jwt.verify(token, secretOrPublicKey, (error, decoded) => {
      if (error) throw reject(error)
      resolve(decoded as TokenPayload) //decoed là payload
      // thay jwt.JwtPayload bằng TokenPayload để được định nghĩa rõ ràng hơn vì đã được setting
    })
  })
}
