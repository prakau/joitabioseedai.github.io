import { useState } from "react";
import { Check, Download, Mail, Save, Share2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { CropSelect, Empty, Field, Notice, Select, Title } from "./workspace";
import { cropGuides } from "../data/agriculture";
import { searchCrops } from "../services/semanticSearch";
import {
  displayDate,
  downloadJson,
  timestamp,
  uid,
  useStored,
} from "../lib/storage";
import {
  analyzeSoil,
  emptySoil,
  soilFields,
  type SoilValues,
} from "../lib/soil";
export function Soil() {
  const [values, setValues] = useState<SoilValues>(emptySoil);
  const [crop, setCrop] = useState("");
  const [lab, setLab] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ReturnType<typeof analyzeSoil> | null>(
    null,
  );
  const [reports, saveReports] = useStored<
    {
      id: string;
      crop: string;
      date: string;
      lab: string;
      sampleDate: string;
      values: SoilValues;
      result: ReturnType<typeof analyzeSoil>;
    }[]
  >("joita-fa-soils-v3", []);
  function submit() {
    setError("");
    setMessage("");
    try {
      const next = analyzeSoil(values);
      setResult(next);
      if (
        saveReports(
          [
            {
              id: uid(),
              crop,
              date: timestamp(),
              lab,
              sampleDate: date,
              values,
              result: next,
            },
            ...reports,
          ].slice(0, 50),
        )
      )
        setMessage("Soil report saved on this device.");
    } catch (e) {
      setResult(null);
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Title
        title="Understand your soil test"
        description="Enter measured values from a laboratory report. Leave unknown fields empty."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="fields fields-3">
          <CropSelect value={crop} onChange={setCrop} />
          <Field label="Lab / test method">
            <Input
              value={lab}
              maxLength={160}
              onChange={(e) => setLab(e.target.value)}
              placeholder="As printed on your report"
            />
          </Field>
          <Field label="Sample date">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
        <div className="fields fields-3">
          {soilFields.map((field) => (
            <Field key={field.key} label={`${field.label} (${field.unit})`}>
              <Input
                type="number"
                step="any"
                min={field.min}
                max={field.max}
                value={values[field.key]}
                onChange={(e) =>
                  setValues({ ...values, [field.key]: e.target.value })
                }
              />
            </Field>
          ))}
        </div>
        <Button type="submit">
          <Save size={18} />
          Analyze and save report
        </Button>
      </form>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {result && (
        <div className="result-list">
          {result.map((item) => (
            <div key={item.label}>
              <h3>
                {item.label}: {item.value}
              </h3>
              <p>{item.interpretation}</p>
            </div>
          ))}
        </div>
      )}
      <p className="muted">
        Screening references:{" "}
        <a
          href="https://agritech.tnau.ac.in/agriculture/agri_soil_rating.html"
          target="_blank"
          rel="noreferrer"
        >
          TNAU soil rating chart
        </a>{" "}
        and{" "}
        <a
          href="https://soilhealth.dac.gov.in/"
          target="_blank"
          rel="noreferrer"
        >
          Soil Health Card programme
        </a>
        . A local lab recommendation takes priority; do not convert these
        categories directly into fertilizer quantities.
      </p>
      <h3>Saved soil reports</h3>
      {!reports.length && <Empty>No soil reports yet.</Empty>}
      {reports.map((item) => (
        <div className="saved-row" key={item.id}>
          <button
            className="text-link"
            onClick={() => {
              setValues(item.values);
              setCrop(item.crop);
              setLab(item.lab);
              setDate(item.sampleDate);
              setResult(item.result);
            }}
          >
            {item.crop || "Soil report"} / {displayDate(item.date)}
          </button>
          <Button
            variant="ghost"
            title="Export soil report"
            aria-label="Export soil report"
            onClick={() => downloadJson("soil-report.json", item)}
          >
            <Download size={18} />
          </Button>
          <Button
            variant="ghost"
            title="Delete soil report"
            aria-label="Delete soil report"
            onClick={() => saveReports(reports.filter((r) => r.id !== item.id))}
          >
            <Trash2 size={18} />
          </Button>
        </div>
      ))}
    </>
  );
}
type Plan = {
  id: string;
  crop: string;
  sowing: string;
  task: string;
  due: string;
  done: boolean;
};
export function Calendar() {
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("All");
  const [plans, savePlans] = useStored<Plan[]>("joita-fa-plans-v3", []);
  const [form, setForm] = useState({
    crop: "Wheat",
    sowing: "",
    task: "Field scouting",
    due: "",
  });
  const [message, setMessage] = useState("");
  const guides = searchCrops(search).filter(
    (c) =>
      season === "All" || c.season.toLowerCase().includes(season.toLowerCase()),
  );
  return (
    <>
      <Title
        title="Crop calendar & field tasks"
        description="Regional crop windows and your own dated field plan."
      />
      <div className="fields fields-2">
        <Field label="Search crops or topics">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Try onion, sarson, or irrigation"
          />
        </Field>
        <Field label="Season">
          <Select value={season} onChange={(e) => setSeason(e.target.value)}>
            {["All", "Kharif", "Rabi", "Summer", "Zaid", "Perennial"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </Select>
        </Field>
      </div>
      <p className="muted">
        Indicative North India windows. Variety, weather, and district guidance
        can change planting dates; stages below are a sequence, not a prediction
        for your field.
      </p>
      <div className="guide-list">
        {guides.map((crop) => (
          <details key={crop.crop}>
            <summary>
              {crop.crop}
              <span>{crop.season}</span>
            </summary>
            <div className="fields fields-2">
              <div>
                <strong>Sowing</strong>
                <p>{crop.sowing}</p>
                {crop.transplanting && <p>Transplant: {crop.transplanting}</p>}
              </div>
              <div>
                <strong>Harvest</strong>
                <p>{crop.harvest}</p>
              </div>
            </div>
            <ol className="stage-list">
              {crop.stages.map((stage) => (
                <li key={stage}>{stage}</li>
              ))}
            </ol>
            <p>{crop.water}</p>
            <p>{crop.stress}</p>
            <Button
              variant="secondary"
              onClick={() => setForm({ ...form, crop: crop.crop })}
            >
              Plan for {crop.crop}
            </Button>
          </details>
        ))}
      </div>
      {!guides.length && (
        <Empty>No matching crop and season. Try another search.</Empty>
      )}
      <section className="section-divider">
        <h3>My field tasks</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (savePlans([{ id: uid(), ...form, done: false }, ...plans]))
              setMessage("Field task saved on this device.");
          }}
        >
          <div className="fields fields-2">
            <CropSelect
              value={form.crop}
              onChange={(crop) => setForm({ ...form, crop })}
            />
            <Field label="Sowing / transplant date (optional)">
              <Input
                type="date"
                value={form.sowing}
                onChange={(e) => setForm({ ...form, sowing: e.target.value })}
              />
            </Field>
            <Field label="Task">
              <Input
                required
                maxLength={160}
                value={form.task}
                onChange={(e) => setForm({ ...form, task: e.target.value })}
              />
            </Field>
            <Field label="Task due date">
              <Input
                required
                type="date"
                value={form.due}
                onChange={(e) => setForm({ ...form, due: e.target.value })}
              />
            </Field>
          </div>
          <Button>
            <Save size={18} />
            Save task
          </Button>
        </form>
        {message && <Notice>{message}</Notice>}
        {!plans.length && <Empty>No scheduled tasks yet.</Empty>}
        {plans.map((plan) => (
          <div className="saved-row" key={plan.id}>
            <label className="check-label">
              <input
                type="checkbox"
                checked={plan.done}
                onChange={() =>
                  savePlans(
                    plans.map((p) =>
                      p.id === plan.id ? { ...p, done: !p.done } : p,
                    ),
                  )
                }
              />
              <span className={plan.done ? "completed" : ""}>
                {plan.crop}: {plan.task}
                <small>
                  Due {plan.due}
                  {plan.sowing ? ` / planted ${plan.sowing}` : ""}
                </small>
              </span>
            </label>
            <Button
              variant="ghost"
              aria-label="Delete task"
              title="Delete task"
              onClick={() => savePlans(plans.filter((p) => p.id !== plan.id))}
            >
              <Trash2 size={18} />
            </Button>
          </div>
        ))}
      </section>
    </>
  );
}
type Post = {
  id: string;
  name: string;
  village: string;
  crop: string;
  issue: string;
  text: string;
  date: string;
};
export function Community() {
  const [posts, savePosts] = useStored<Post[]>("joita-fa-posts", []);
  const [form, setForm] = useState({
    name: "",
    village: "",
    crop: "",
    issue: "Question",
    text: "",
  });
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const realPosts = posts.filter((p) => !p.id.startsWith("seed-"));
  const filtered = realPosts.filter((p) =>
    `${p.crop} ${p.text} ${p.name} ${p.village}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function share(post: Post) {
    const text = `${post.crop}: ${post.text}\n${post.village}\nShared from JOITA FarmAssist`;
    try {
      if (navigator.share)
        await navigator.share({ title: "FarmAssist field note", text });
      else {
        await navigator.clipboard.writeText(text);
        setMessage("Field note copied. You can share it in your farmer group.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setMessage(
          "Sharing is unavailable. Use Email JOITA or export your notes.",
        );
    }
  }
  return (
    <>
      <Title
        title="Farmer community / field notes"
        description="Keep notes on your device and share them with your farmer group."
      />
      <Notice>
        These posts are private to this browser. A shared public community
        service is not connected. Saving a note does not publish it or send it
        to JOITA.
      </Notice>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.text.trim()) return;
          if (
            savePosts(
              [
                {
                  id: uid(),
                  ...form,
                  name: form.name.trim() || "Farmer",
                  date: timestamp(),
                },
                ...realPosts,
              ].slice(0, 100),
            )
          ) {
            setMessage("Field note saved on this device.");
            setForm({ ...form, text: "" });
          }
        }}
      >
        <div className="fields fields-3">
          <Field label="Name (optional)">
            <Input
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Village / district (optional)">
            <Input
              maxLength={100}
              value={form.village}
              onChange={(e) => setForm({ ...form, village: e.target.value })}
            />
          </Field>
          <CropSelect
            value={form.crop}
            onChange={(crop) => setForm({ ...form, crop })}
          />
        </div>
        <Field label="Field note or question">
          <Textarea
            required
            maxLength={2000}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />
        </Field>
        <Button>
          <Save size={18} />
          Save field note
        </Button>
      </form>
      {message && <Notice>{message}</Notice>}
      <Field label="Search field notes">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Field>
      {!filtered.length && (
        <Empty>
          {realPosts.length
            ? "No matching field notes."
            : "Your first field note will appear here."}
        </Empty>
      )}
      {filtered.map((post) => (
        <article className="field-note" key={post.id}>
          <div>
            <h3>{post.crop || "Field note"}</h3>
            <small>
              {post.name} / {post.village || "Location not entered"} /{" "}
              {displayDate(post.date)}
            </small>
            <p>{post.text}</p>
          </div>
          <div className="actions">
            <Button variant="secondary" onClick={() => void share(post)}>
              <Share2 size={17} />
              Share
            </Button>
            <a
              className="text-link"
              href={`mailto:contact@joitabioseedai.com?subject=FarmAssist%20field%20question&body=${encodeURIComponent(post.text)}`}
            >
              <Mail size={17} />
              Email JOITA
            </a>
            <Button
              variant="ghost"
              aria-label="Delete field note"
              title="Delete field note"
              onClick={() =>
                savePosts(realPosts.filter((p) => p.id !== post.id))
              }
            >
              <Trash2 size={18} />
            </Button>
          </div>
        </article>
      ))}
      {!!realPosts.length && (
        <Button
          variant="ghost"
          onClick={() => downloadJson("farmassist-field-notes.json", realPosts)}
        >
          <Download size={17} />
          Export notes
        </Button>
      )}
    </>
  );
}
