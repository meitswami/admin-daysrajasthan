import { Label, Select } from "@/components/ui/input";
import { PACKAGE_DURATIONS, PACKAGE_TYPES } from "@/lib/constants/package-options";

export function PackageTypeSelect({
  name = "package_type",
  defaultValue,
  value,
  onChange,
  className,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>Package Type</Label>
      <Select
        id={name}
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        className={className ?? "mt-1.5"}
      >
        <optgroup label="Select Package Type">
          {PACKAGE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </optgroup>
      </Select>
    </div>
  );
}

export function PackageDurationSelect({
  name = "package_duration",
  defaultValue,
  value,
  onChange,
  className,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>Package Days Duration</Label>
      <Select
        id={name}
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        className={className ?? "mt-1.5"}
      >
        <optgroup label="Package Days Duration">
          {PACKAGE_DURATIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </optgroup>
      </Select>
    </div>
  );
}
