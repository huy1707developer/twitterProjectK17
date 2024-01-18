import { TokenPayload } from './models/requests/User.requests'
import { Request } from 'express'
//file này để định nghĩa những module cần thiết
//vd express cũng là một trong những module
// định nhĩa những thằng trong request

// vì thằng user làm gì có trong request nên là trong file này để định nghĩa lại thằng request có user

declare module 'express' {
  interface Request {
    user?: User
    decoded_authorization?: TokenPayload
    decoded_refresh_token?: TokenPayload
    decoded_email_verify_token?: TokenPayload
    decoded_forgot_password_token?: TokenPayload
  }
}
