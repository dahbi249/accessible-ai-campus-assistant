import { authService } from './authService';
import { chatService } from './chatService';
import {
  buildGoogleMapsUrl,
  dataService,
  TAMANRASSET_CAMPUS_CENTER,
} from './dataService';
import {
  ApiError,
  getApiMode,
  getAuthToken,
  getBackendBaseUrlDisplay,
  isAuthTokenExpired,
  isSafeHttpUrl,
  onUnauthorized,
  setApiMode,
  setAuthToken,
} from './httpClient';

export {
  ApiError,
  authService,
  buildGoogleMapsUrl,
  chatService,
  dataService,
  getApiMode,
  getAuthToken,
  getBackendBaseUrlDisplay,
  isAuthTokenExpired,
  isSafeHttpUrl,
  onUnauthorized,
  setApiMode,
  setAuthToken,
  TAMANRASSET_CAMPUS_CENTER,
};

export const campusApi = {
  sendChatMessage: chatService.sendChatMessage,
  sendChatMessageStream: chatService.sendChatMessageStream,
  submitMessageFeedback: chatService.submitMessageFeedback,
  loginStudent: authService.loginStudent,
  getAnnouncements: dataService.getAnnouncements,
  getCampusLocations: dataService.getCampusLocations,
};
