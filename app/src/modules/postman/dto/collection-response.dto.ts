export class CollectionMetadataDto {
  id: string;
  name: string;
  owner: string;
  uid: string;
  createdAt: string;
  updatedAt: string;
}

export class CollectionDetailDto {
  info: {
    name: string;
    description?: string;
    schema: string;
    version?: string;
  };
  item: any[];
  variable?: any[];
  auth?: any;
  event?: any[];
}
