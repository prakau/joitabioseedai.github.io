import { answerLanguages } from "../lib/languages";
import { Field, Select } from "./workspace";

export function LanguageSelect({
  value,
  onChange,
  label = "Answer language",
}: {
  value: string;
  onChange: (language: string) => void;
  label?: string;
}) {
  return (
    <Field label={label}>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="Auto">Automatic / Match my question</option>
        {answerLanguages.map(({ name, native }) => (
          <option key={name} value={name}>
            {name === native ? name : `${name} / ${native}`}
          </option>
        ))}
      </Select>
    </Field>
  );
}
