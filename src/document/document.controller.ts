import {Controller, Get, Res} from '@nestjs/common';
import {DocumentService} from "./document.service";

@Controller()
export class DocumentController {
    constructor(private readonly documentService: DocumentService) {}

    @Get('/document')
    getDocument(@Res() res: any) {
        const pdfData =  this.documentService.getPdfFile()
        res.send(pdfData);
    }

}
