import { STORAGE_API } from "../constants";
import { IpfsUploadResponse } from "../types";

export const uploadFileToIPFS = async (
  file: File,
): Promise<IpfsUploadResponse> => {
  const form = new FormData();
  form.append("file", file);
  form.append("name", file.name);

  const response = await fetch(STORAGE_API, {
    method: "post",
    headers: {},
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = (await response.json()) as IpfsUploadResponse;
  return data;
};
