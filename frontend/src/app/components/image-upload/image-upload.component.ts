import { Component } from '@angular/core';
import { ImageService } from 'src/app/services/image.service';


class ImageSnippet {
  pending: boolean = false;
  status: string = 'init';

  constructor(public src: string, public file: File) {}
}

@Component({
  selector: 'app-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.css']
})
export class ImageUploadComponent {

  selectedFile?: ImageSnippet;

  constructor(
    private imageService: ImageService
  ) { }

  processFile(imageInput: any) {
    const file: File = imageInput.files[0];
    const reader = new FileReader();

    reader.addEventListener('load', (event: any) => {

      this.selectedFile = new ImageSnippet(event.target.result, file);
      console.log(this.selectedFile);


      this.selectedFile.pending = true;
      this.imageService.uploadImage(this.selectedFile.file)
        .subscribe(() => this.onSuccess(), () => this.onError());
    });

    reader.readAsDataURL(file);
  }

  private onSuccess() {
    console.log('onSuccess');
    console.log(this.selectedFile);
    if (!this.selectedFile) {
      return;
    }

    this.selectedFile.pending = false;
    this.selectedFile.status = 'ok';
  }

  private onError() {
    console.log('onError');
    if (!this.selectedFile) {
      return;
    }

    this.selectedFile.pending = false;
    this.selectedFile.status = 'fail';
    this.selectedFile.src = '';
  }
}
