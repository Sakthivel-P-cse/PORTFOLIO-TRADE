"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/fetcher";

export type ProfileDTO = { id: string; email: string; name: string | null; avatarUrl: string | null };

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: () => api<ProfileDTO>("/api/profile") });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (name: string) => api<ProfileDTO>("/api/profile", { method: "PATCH", body: JSON.stringify({ name }) }), onSuccess: () => { toast.success("Profile saved"); queryClient.invalidateQueries({ queryKey: ["profile"] }); }, onError: (error: Error) => toast.error(error.message) });
}
