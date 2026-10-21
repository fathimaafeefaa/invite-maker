"use client";

import { deleteInvitation } from "@/app/actions/invitations";

export function DeleteInvitationButton({ id }: { id: string }) {
  return (
    <form
      action={deleteInvitation.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm("Delete this invitation? The link will stop working and all RSVPs will be lost.")) e.preventDefault();
      }}
    >
      <button className="text-xs uppercase tracking-[0.2em] text-red-700 opacity-70 transition hover:opacity-100">Delete</button>
    </form>
  );
}
