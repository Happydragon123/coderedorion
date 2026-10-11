import { createListingSchema, listingDetailsSchema, photoFileSchema, photoResponseSchema, type Listing } from '../../lib/contracts';

// Kept in the form for its lifetime; only a confirmed response is reusable.
export class PhotoAttachment {
  file?: File;
  path: string | null = null;
  select(file?: File) { this.file = file; this.path = null; }
  validationMessage() {
    if (!this.file) return 'Choose a food photo before publishing.';
    if (!photoFileSchema.safeParse(this.file).success) return 'Choose a nonempty JPEG, PNG or WebP image up to 5 MiB.';
    return '';
  }
  async publish(details: unknown, actions: {
    upload: (body: FormData) => Promise<unknown>;
    create: (body: ReturnType<typeof createListingSchema.parse>) => Promise<{ listing: Listing }>;
    stage: (message: string) => void;
  }) {
    const input = listingDetailsSchema.parse(details);
    const error = this.validationMessage();
    if (error) throw new Error(error);
    if (!this.path) {
      actions.stage('Uploading and validating food photo…');
      const selected = this.file!;
      const body = new FormData(); body.set('photo', selected);
      const { photo_path } = photoResponseSchema.parse(await actions.upload(body));
      if (this.file !== selected) throw new Error('The selected photo changed. Publish again with the new photo.');
      this.path = photo_path;
    }
    actions.stage('Photo uploaded. Publishing listing…');
    return actions.create(createListingSchema.parse({ ...input, photo_path: this.path }));
  }
}
