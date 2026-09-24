import { createEvents, type EventAttributes } from "ics";

export const PLAN_KEY = "joita-fa-plans-v3";
export type Plan = {
  id: string;
  crop: string;
  sowing: string;
  task: string;
  due: string;
  done: boolean;
};
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function isDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const date = new Date(`${value}T12:00:00Z`);
  return (
    year >= 1900 &&
    year <= 2100 &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}
export function validatePlan(plan: Omit<Plan, "id" | "done">) {
  if (!plan.task.trim() || plan.task.length > 160)
    throw new Error("Enter a task of 1 to 160 characters.");
  if (!isDay(plan.due)) throw new Error("Choose a valid task due date.");
  if (plan.sowing && !isDay(plan.sowing))
    throw new Error("Choose a valid sowing date or leave it empty.");
}
export function planStatus(plan: Plan, today = localDay()) {
  if (plan.done) return "Completed";
  if (plan.due < today) return "Overdue";
  if (plan.due === today) return "Today";
  return "Upcoming";
}
export function upcomingPlans(plans: Plan[]) {
  return plans
    .filter((plan) => !plan.done && isDay(plan.due))
    .sort((a, b) => a.due.localeCompare(b.due));
}
export function calendarFile(plans: Plan[]) {
  if (!plans.length) throw new Error("There are no tasks to export.");
  const events: EventAttributes[] = plans.map((plan) => {
    validatePlan(plan);
    const [year, month, day] = plan.due.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return {
      uid: `${plan.id}@farmassist.joitabioseedai.com`,
      start: [year, month, day],
      end: [next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()],
      title: `${plan.crop || "Farm"}: ${plan.task}`,
      description: `JOITAFA field task. ${plan.sowing ? `Sowing date: ${plan.sowing}. ` : ""}Confirm crop treatment decisions with your local agriculture expert.`,
      classification: "PRIVATE",
      status: "CONFIRMED",
      transp: "TRANSPARENT",
      productId: "JOITAFA",
    };
  });
  const { error, value } = createEvents(events);
  if (error || !value)
    throw new Error(
      "Calendar export could not be created. Check the task dates.",
    );
  return value;
}
