import { useRef, useState } from "react";
import { Download, Pencil, Save, Trash2, Undo2, X } from "lucide-react";
import {
  LEDGER_KEY,
  formatMoney,
  ledgerCategories,
  ledgerTotals,
  parseMoney,
  type LedgerEntry,
} from "../lib/farm-tools";
import { isDay, localDay } from "../lib/planning";
import { downloadJson, uid, useStored } from "../lib/storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { CropSelect, Empty, Field, Notice, Select, Title } from "./workspace";

type Draft = Omit<LedgerEntry, "id" | "amountPaise"> & { amount: string };
const emptyDraft = (): Draft => ({
  date: localDay(),
  type: "expense",
  crop: "",
  category: "Seed",
  amount: "",
  note: "",
});
export function FarmLedger() {
  const [entries, saveEntries] = useStored<LedgerEntry[]>(LEDGER_KEY, []);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState("");
  const [deleted, setDeleted] = useState<LedgerEntry | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cropFilter, setCropFilter] = useState("");
  const [month, setMonth] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const filtered = entries
    .filter(
      (entry) =>
        (!cropFilter || entry.crop === cropFilter) &&
        (!month || entry.date.startsWith(month)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const totals = ledgerTotals(filtered);
  function submit() {
    setError("");
    setMessage("");
    try {
      if (!isDay(draft.date) || draft.date > localDay())
        throw new Error("Enter the actual transaction date, today or earlier.");
      if (editing && !entries.some((entry) => entry.id === editing))
        throw new Error(
          "This entry was removed in another tab. Cancel the edit and add a new transaction.",
        );
      if (!ledgerCategories[draft.type].includes(draft.category))
        throw new Error("Choose a category for this transaction type.");
      const entry: LedgerEntry = {
        id: editing || uid(),
        date: draft.date,
        type: draft.type,
        crop: draft.crop,
        category: draft.category,
        note: draft.note.trim(),
        amountPaise: parseMoney(draft.amount),
      };
      if (!editing && entries.length >= 1000)
        throw new Error(
          "This device has 1,000 entries. Export and remove older records before adding more.",
        );
      if (
        saveEntries(
          editing
            ? entries.map((item) => (item.id === editing ? entry : item))
            : [entry, ...entries],
        )
      ) {
        setMessage(
          editing
            ? "Transaction updated."
            : "Transaction saved on this device.",
        );
        setEditing("");
        setDraft({ ...draft, amount: "", note: "" });
      }
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  return (
    <>
      <Title
        title="Farm income & expenses"
        description="Your recorded transactions in INR. Private to this device."
      />
      <div className="fields fields-2 ledger-filters">
        <Field label="Filter by crop">
          <Select
            value={cropFilter}
            onChange={(event) => setCropFilter(event.target.value)}
          >
            <option value="">All crops</option>
            {[...new Set(entries.map((entry) => entry.crop).filter(Boolean))]
              .sort()
              .map((crop) => (
                <option key={crop}>{crop}</option>
              ))}
          </Select>
        </Field>
        <Field label="Filter by month">
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </Field>
      </div>
      {(cropFilter || month) && (
        <button
          className="text-link"
          onClick={() => {
            setCropFilter("");
            setMonth("");
          }}
        >
          <X size={16} />
          Clear filters
        </button>
      )}
      <div className="metrics ledger-totals">
        <div>
          <strong>{formatMoney(totals.income)}</strong>
          <span>Recorded income</span>
        </div>
        <div>
          <strong>{formatMoney(totals.expenses)}</strong>
          <span>Recorded expenses</span>
        </div>
        <div>
          <strong>{formatMoney(totals.net)}</strong>
          <span>Recorded net balance</span>
        </div>
      </div>
      <p className="muted">
        Totals follow the selected filters. Net balance excludes unrecorded
        costs, inventory, unpaid amounts and tax; it is not a profit forecast.
      </p>
      <section className="section-divider">
        <h3>{editing ? "Edit transaction" : "Add transaction"}</h3>
        <form
          ref={form}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="fields fields-3">
            <Field label="Transaction type">
              <Select
                value={draft.type}
                onChange={(event) => {
                  const type = event.target.value as Draft["type"];
                  setDraft({
                    ...draft,
                    type,
                    category: ledgerCategories[type][0],
                  });
                }}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </Field>
            <Field label="Amount (INR)">
              <Input
                required
                type="number"
                min="0.01"
                max="100000000"
                step="0.01"
                value={draft.amount}
                onChange={(event) =>
                  setDraft({ ...draft, amount: event.target.value })
                }
              />
            </Field>
            <Field label="Transaction date">
              <Input
                required
                type="date"
                max={localDay()}
                value={draft.date}
                onChange={(event) =>
                  setDraft({ ...draft, date: event.target.value })
                }
              />
            </Field>
            <CropSelect
              value={draft.crop}
              onChange={(crop) => setDraft({ ...draft, crop })}
            />
            <Field label="Category">
              <Select
                value={draft.category}
                onChange={(event) =>
                  setDraft({ ...draft, category: event.target.value })
                }
              >
                {ledgerCategories[draft.type].map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </Select>
            </Field>
            <Field label="Note (optional)">
              <Input
                maxLength={180}
                value={draft.note}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
              />
            </Field>
          </div>
          <div className="actions">
            <Button type="submit">
              <Save size={18} />
              {editing ? "Update transaction" : "Save transaction"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing("");
                  setDraft(emptyDraft());
                }}
              >
                <X size={18} />
                Cancel edit
              </Button>
            )}
          </div>
        </form>
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
      </section>
      <section className="section-divider">
        <div className="section-row">
          <h3>Transactions ({filtered.length})</h3>
          <Button
            variant="ghost"
            disabled={!filtered.length}
            onClick={() =>
              downloadJson("farmassist-transactions.json", {
                currency: "INR",
                exportedAt: new Date().toISOString(),
                filters: { crop: cropFilter, month },
                entries: filtered,
                totalsPaise: totals,
              })
            }
          >
            <Download size={18} />
            Export transactions
          </Button>
        </div>
        {deleted && (
          <Notice>
            Transaction deleted.{" "}
            <button
              className="text-link"
              onClick={() => {
                if (saveEntries([deleted, ...entries])) setDeleted(null);
              }}
            >
              <Undo2 size={17} />
              Undo deletion
            </button>
          </Notice>
        )}
        {!filtered.length && (
          <Empty>No transactions match these filters.</Empty>
        )}
        <div className="ledger-list">
          {filtered.map((entry) => (
            <article className="ledger-row" key={entry.id}>
              <div>
                <strong>{entry.category}</strong>
                <small>
                  {entry.date} / {entry.crop || "Whole farm"}
                </small>
                {entry.note && <p>{entry.note}</p>}
              </div>
              <div className="ledger-amount">
                <strong>
                  {entry.type === "expense" ? "-" : "+"}
                  {formatMoney(entry.amountPaise)}
                </strong>
                <small>{entry.type === "expense" ? "Expense" : "Income"}</small>
              </div>
              <div className="ledger-actions">
                <button
                  className="icon-action"
                  title="Edit transaction"
                  aria-label={`Edit transaction: ${entry.category}`}
                  onClick={() => {
                    setEditing(entry.id);
                    setDraft({
                      date: entry.date,
                      type: entry.type,
                      crop: entry.crop,
                      category: entry.category,
                      note: entry.note,
                      amount: (entry.amountPaise / 100).toFixed(2),
                    });
                    setMessage("");
                    setError("");
                    form.current?.scrollIntoView({
                      block: "center",
                      behavior: "instant",
                    });
                  }}
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="icon-action"
                  title="Delete transaction"
                  aria-label={`Delete transaction: ${entry.category}`}
                  onClick={() => {
                    if (
                      saveEntries(
                        entries.filter((item) => item.id !== entry.id),
                      )
                    ) {
                      setDeleted(entry);
                      if (editing === entry.id) {
                        setEditing("");
                        setDraft(emptyDraft());
                      }
                    }
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
