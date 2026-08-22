import { apiClient } from "../../lib/api-client";
import type { NotificationList, NotificationRecord } from "../../types/domain";

export const notificationsApi = {
  list: (page: number) =>
    apiClient.request<NotificationList>(`/notifications?page=${String(page)}&page_size=20`),
  read: (id: string) =>
    apiClient.request<NotificationRecord>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
    }),
  readAll: () =>
    apiClient.request<{ updated_count: number }>("/notifications/read-all", { method: "PATCH" }),
};
