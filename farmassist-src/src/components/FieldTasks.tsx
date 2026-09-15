import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarPlus,
  Download,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  PLAN_KEY,
  calendarFile,
  localDay,
  planStatus,
  upcomingPlans,
  validatePlan,
  type Plan,
} from "../lib/planning";
import {
  downloadText,
  readStored,
  uid,
  useStored,
  writeStored,
} from "../lib/storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Empty, Field, Notice } from "./workspace";

export function TaskList({
  plans,
  onChange,
  onEdit,
  compact = false,
}: {
  plans: Plan[];
  onChange: (plan: Plan, action: "toggle" | "delete") => void;
  onEdit?: (plan: Plan) => void;
  compact?: boolean;
}) {
  const [error, setError] = useState("");
  return (
    <>
      {error && <Notice error>{error}</Notice>}
      {plans.map((plan) => (
        <div className="task-row" key={plan.id}>
          <label className="check-label">
            <input
              type="checkbox"
              checked={plan.done}
              onChange={() => onChange(plan, "toggle")}
            />
            <span className={plan.done ? "completed" : ""}>
              {plan.crop || "Farm"}: {plan.task}
              <small>
                Due {plan.due}
                {plan.sowing ? ` / planted ${plan.sowing}` : ""}
              </small>
            </span>
          </label>
          <span
            className={`task-status status-${planStatus(plan).toLowerCase()}`}
          >
            {planStatus(plan)}
          </span>
          {!compact && (
            <div className="task-actions">
              {onEdit && (
                <button
                  className="icon-action"
                  title="Edit task"
                  aria-label="Edit task"
                  onClick={() => onEdit(plan)}
                >
                  <Pencil size={17} />
                </button>
              )}
              <button
                className="icon-action"
                title="Export task to calendar"
                aria-label="Export task to calendar"
                onClick={() => {
                  try {
                    downloadText(
                      "farmassist-task.ics",
                      calendarFile([plan]),
                      "text/calendar;charset=utf-8",
                    );
                    setError("");
                  } catch (failure) {
                    setError((failure as Error).message);
                  }
                }}
              >
                <Download size={17} />
              </button>
              <button
                className="icon-action"
                title="Delete task"
                aria-label="Delete task"
                onClick={() => onChange(plan, "delete")}
              >
                <Trash2 size={17} />
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export function UpcomingTasks() {
  const [plans, savePlans] = useStored<Plan[]>(PLAN_KEY, []);
  const upcoming = upcomingPlans(plans);
  const overdue = upcoming.filter(
    (plan) => planStatus(plan) === "Overdue",
  ).length;
  return (
    <section className="dashboard-tasks">
      <div className="section-row">
        <h3>Your next field tasks</h3>
        <NavLink className="text-link" to="/calendar">
          Calendar
          <ArrowUpRight size={17} />
        </NavLink>
      </div>
      {overdue > 0 && (
        <p className="overdue-note">
          {overdue} overdue {overdue === 1 ? "task" : "tasks"}
        </p>
      )}
      {!upcoming.length && (
        <Empty>
          No open tasks. Your next field check can be planned from an advisory
          answer or the calendar.
        </Empty>
      )}
      <TaskList
        plans={upcoming.slice(0, 5)}
        compact
        onChange={(plan) =>
          savePlans(
            plans.map((item) =>
              item.id === plan.id ? { ...item, done: !item.done } : item,
            ),
          )
        }
      />
      {upcoming.length > 5 && (
        <NavLink className="text-link" to="/calendar">
          View all {upcoming.length} open tasks
        </NavLink>
      )}
    </section>
  );
}

export function AdvisoryTask({ crop }: { crop: string }) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState(`Inspect ${crop || "crop"} field`);
  const [due, setDue] = useState(localDay());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="advisory-task">
      <Button
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <CalendarPlus size={18} />
        Create field task
      </Button>
      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            try {
              const draft = { crop, task: task.trim(), due, sowing: "" };
              validatePlan(draft);
              const plans = readStored<Plan[]>(PLAN_KEY, []);
              if (plans.length >= 1000)
                throw new Error(
                  "Export and remove older tasks before adding more.",
                );
              if (
                writeStored(PLAN_KEY, [
                  { ...draft, id: uid(), done: false },
                  ...plans,
                ])
              ) {
                setSaved(true);
                setOpen(false);
              }
            } catch (failure) {
              setError((failure as Error).message);
            }
          }}
        >
          <div className="fields fields-2">
            <Field label="Follow-up task">
              <Input
                required
                maxLength={160}
                value={task}
                onChange={(event) => setTask(event.target.value)}
              />
            </Field>
            <Field label="Follow-up due date">
              <Input
                required
                type="date"
                value={due}
                onChange={(event) => setDue(event.target.value)}
              />
            </Field>
          </div>
          <div className="actions">
            <Button type="submit">
              <Save size={17} />
              Save field task
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
              Cancel
            </Button>
          </div>
          {error && <Notice error>{error}</Notice>}
        </form>
      )}
      {saved && (
        <Notice>
          Field task saved.{" "}
          <NavLink className="text-link" to="/calendar">
            Open calendar
            <ArrowUpRight size={17} />
          </NavLink>
        </Notice>
      )}
    </div>
  );
}
