"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Building2,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Owner } from "@/types/database";
import { buildWhatsAppUrl, formatPhoneBR } from "@/lib/format";
import {
  deleteOwner,
  saveOwner,
} from "@/app/admin/(panel)/proprietarios/actions";

export interface OwnerWithCount extends Owner {
  propertyCount: number;
}

interface OwnersManagerProps {
  owners: OwnerWithCount[];
}

export function OwnersManager({ owners }: OwnersManagerProps) {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<OwnerWithCount | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredOwners = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter(
      (owner) =>
        owner.name.toLowerCase().includes(q) ||
        (owner.phone ?? "").toLowerCase().includes(q) ||
        (owner.notes ?? "").toLowerCase().includes(q),
    );
  }, [owners, query]);

  function openNewModal() {
    setEditingOwner(null);
    setFeedback(null);
    setModalOpen(true);
  }

  function openEditModal(owner: OwnerWithCount) {
    setEditingOwner(owner);
    setFeedback(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (isPending) return;
    setModalOpen(false);
    setEditingOwner(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveOwner(formData);
      if (result.ok) {
        setModalOpen(false);
        setEditingOwner(null);
        setFeedback({
          type: "success",
          text: result.message ?? "Salvo com sucesso.",
        });
      } else {
        setFeedback({
          type: "error",
          text: result.message ?? "Erro ao salvar.",
        });
      }
    });
  }

  function handleDelete(owner: OwnerWithCount) {
    const confirmed = window.confirm(
      `Deseja excluir o proprietário "${owner.name}"?${
        owner.propertyCount > 0
          ? ` Os ${owner.propertyCount} imóvel(is) vinculados permanecerão cadastrados sem proprietário.`
          : ""
      }`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteOwner(owner.id);
      setFeedback({
        type: result.ok ? "success" : "error",
        text:
          result.message ??
          (result.ok ? "Proprietário excluído." : "Erro ao excluir."),
      });
    });
  }

  return (
    <div className="space-y-5">
      {/* Barra superior */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, telefone ou observação..."
            className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Novo Proprietário
        </button>
      </div>

      {/* Feedback */}
      {feedback && !modalOpen ? (
        <div
          role="status"
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded p-1 hover:bg-black/5"
            aria-label="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {filteredOwners.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted">
              {owners.length === 0
                ? "Nenhum proprietário cadastrado ainda."
                : "Nenhum proprietário encontrado com essa busca."}
            </p>
            {owners.length === 0 ? (
              <button
                type="button"
                onClick={openNewModal}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
                Cadastrar primeiro proprietário
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-6 py-3.5">Nome</th>
                  <th className="px-6 py-3.5">Telefone / WhatsApp</th>
                  <th className="px-6 py-3.5">Imóveis</th>
                  <th className="px-6 py-3.5">Observações</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOwners.map((owner) => {
                  const formattedPhone = formatPhoneBR(owner.phone);
                  const cleanDigits = (owner.phone ?? "").replace(/\D/g, "");
                  const whatsappHref =
                    cleanDigits.length >= 10
                      ? buildWhatsAppUrl(
                          `Olá ${owner.name}, aqui é o Marcelo Santos sobre o seu imóvel.`,
                          cleanDigits,
                        )
                      : null;

                  return (
                    <tr key={owner.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {owner.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {formattedPhone ? (
                          <div className="flex items-center gap-2">
                            <span className="text-foreground">
                              {formattedPhone}
                            </span>
                            {whatsappHref ? (
                              <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chamar no WhatsApp"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-whatsapp/15 text-emerald-700 transition hover:bg-whatsapp hover:text-white"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-foreground">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          {owner.propertyCount}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-6 py-4 text-muted">
                        {owner.notes || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(owner)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(owner)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar/Editar */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-modal-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2
                id="owner-modal-title"
                className="font-serif text-xl font-semibold text-foreground"
              >
                {editingOwner ? "Editar Proprietário" : "Novo Proprietário"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-muted hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {editingOwner ? (
                <input type="hidden" name="id" value={editingOwner.id} />
              ) : null}

              {feedback?.type === "error" ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
                  {feedback.text}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="owner-name"
                  className="block text-sm font-medium text-foreground"
                >
                  Nome completo *
                </label>
                <input
                  id="owner-name"
                  name="name"
                  type="text"
                  required
                  defaultValue={editingOwner?.name ?? ""}
                  placeholder="Ex.: Carlos Eduardo Silva"
                  className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div>
                <label
                  htmlFor="owner-phone"
                  className="block text-sm font-medium text-foreground"
                >
                  Telefone / WhatsApp
                </label>
                <input
                  id="owner-phone"
                  name="phone"
                  type="tel"
                  defaultValue={editingOwner?.phone ?? ""}
                  placeholder="(11) 99999-9999"
                  className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div>
                <label
                  htmlFor="owner-notes"
                  className="block text-sm font-medium text-foreground"
                >
                  Observações privadas
                </label>
                <textarea
                  id="owner-notes"
                  name="notes"
                  rows={3}
                  defaultValue={editingOwner?.notes ?? ""}
                  placeholder="Ex.: Aceita permuta até R$ 200 mil, chave na portaria, prefere contato à tarde..."
                  className="mt-1.5 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : editingOwner ? (
                    "Salvar Alterações"
                  ) : (
                    "Cadastrar Proprietário"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
