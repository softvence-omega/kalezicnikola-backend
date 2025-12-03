import { extname, join } from 'path';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';

export const fileStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = join(process.cwd(), 'uploads');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = extname(file.originalname);
    cb(null, uniqueName + extension);
  },
});

export const imageFileFilter = (req: any, file: Express.Multer.File, cb: Function) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|svg)$/i)) {
    return cb(new Error('Only image files (jpg, jpeg, png, svg) are allowed!'), false);
  }
  cb(null, true);
};