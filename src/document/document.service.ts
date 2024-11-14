import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentService {

    getPdfFile() {
        const filePath: string = path.join(__dirname, '..', '../src/assets/files', 'Document.pdf');
        const fileBuffer = fs.readFileSync(filePath);
        return fileBuffer;
    }

}
