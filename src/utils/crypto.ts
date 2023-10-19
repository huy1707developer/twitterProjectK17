// mã hóa mk

import { createHash } from 'crypto'
import { config } from 'dotenv'
config()
// đoạn code này lấy tư trang chủ SHA256
function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

//mã hóa password
export function hashPassword(password: string) {
  return sha256(password + process.env.PASSWORD_SECRET)
}
