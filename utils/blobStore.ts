// SDK store singleton wired to this project's IndexedDB adapter.
// Keep all access behind DB so we do not open competing IndexedDB connections.
import { createBlobStore } from '@rei-standard/blob-store';
import { DB } from './db';

export const blobStore = createBlobStore({
    adapter: {
        get: (id) => DB.getBlobAsset(id),
        put: (id, blob) => DB.putBlobAsset(id, blob),
        delete: (id) => DB.deleteBlobAsset(id),
        keys: () => DB.listBlobAssetIds(),
    },
});
