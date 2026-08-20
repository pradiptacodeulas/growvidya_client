import apiClient from './axios.config';

/**
 * Upload single file (Image / Document) to the server
 * @param {File} file - Browser File object
 * @param {string} folder - Destination subfolder (e.g. 'student/student_pic', 'student/attachment', 'parent/profile')
 * @returns {Promise<{ success: boolean, data: { file_path: string, file_name: string, url: string } }>}
 */
export const uploadFileApi = async (file, folder = 'general') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await apiClient.post('/upload/single', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Upload multiple files to the server
 * @param {FileList|File[]} files - Browser files
 * @param {string} folder - Destination subfolder
 * @returns {Promise<{ success: boolean, data: { files: Array<{ file_path: string, file_name: string, url: string }> } }>}
 */
export const uploadMultipleFilesApi = async (files, folder = 'general') => {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append('files', f));
  formData.append('folder', folder);

  const response = await apiClient.post('/upload/multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};
