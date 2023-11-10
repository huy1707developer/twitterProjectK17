import { Request, Response, NextFunction } from 'express'
import formidable from 'formidable'
import path from 'path'
import { handleUploadSingleImage } from '~/utils/file'
// console.log(__dirname) //log thử để xem
// console.log(path.resolve()) //D:\toturalReact2022\nodejs-backend\ch04-tweetProject
// console.log(path.resolve('uploads')) //D:\toturalReact2022\nodejs-backend\ch04-tweetProject\uploads

export const uploadSingleImageController = async (req: Request, res: Response) => {
  const data = await handleUploadSingleImage(req)
  return res.json({
    result: data
  })
}
