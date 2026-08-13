"use client";

import { useState, useCallback } from "react";
import { AgendaService, AgendaItem } from "@/services/agenda.service";

export function useAgenda() {
  const [agendas, setAgendas] = useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgenda = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await AgendaService.getUserAgenda();
      setAgendas(data);
    } catch (err: any) {
      const message = err.response?.data?.error || "Failed to fetch agenda recommendations";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateAgenda = useCallback(async (eventId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await AgendaService.generateAgenda(eventId);
      await fetchAgenda();
      return data;
    } catch (err: any) {
      const message = err.response?.data?.error || "Failed to generate agenda recommendations";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAgenda]);

  const updateStatus = useCallback(async (agendaId: number, status: "ACCEPTED" | "DECLINED") => {
    try {
      const updated = await AgendaService.updateAgendaStatus(agendaId, status);
      setAgendas((prev) =>
        prev.map((item) => (item.id === agendaId ? { ...item, status: updated.status } : item))
      );
      return updated;
    } catch (err: any) {
      const message = err.response?.data?.error || "Failed to update agenda status";
      setError(message);
      throw err;
    }
  }, []);

  const downloadICS = useCallback(async () => {
    try {
      await AgendaService.downloadICSFeed();
    } catch (err: any) {
      setError("Failed to download iCal feed");
    }
  }, []);

  return {
    agendas,
    isLoading,
    error,
    fetchAgenda,
    generateAgenda,
    updateStatus,
    downloadICS
  };
}
