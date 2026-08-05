import type { ReactNode } from "react";

/**
 * FORM PRIMITIVES
 * =============================================================================
 * These are SERVER Components. A text input needs no client-side JavaScript — the
 * form posts, the server validates, the page re-renders with errors. Only
 * `SubmitButton` (which reads pending state) is a Client Component.
 *
 * ACCESSIBILITY CONTRACT, honoured by every control here:
 *   - a real <label> bound to the control by id
 *   - required fields marked both visually and with the `required` attribute
 *   - `aria-invalid` when a field has an error
 *   - `aria-describedby` pointing at the error AND any hint text
 *   - errors rendered as text next to the field, never as colour alone
 */

const inputBase =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-navy-600";

function borderFor(hasError: boolean): string {
  return hasError
    ? "border-crest-red-600 focus:border-crest-red-600"
    : "border-line-strong";
}

/* --------------------------------- wrapper --------------------------------- */

export function Field({
  label,
  name,
  error,
  hint,
  required = false,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-navy-900">
        {label}
        {required ? (
          <span className="ml-1 text-crest-red-600" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-ink-subtle">
            (optional)
          </span>
        )}
      </label>
      {hint ? (
        <p id={`${name}-hint`} className="text-sm text-ink-subtle">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm font-medium text-crest-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** ids for aria-describedby: error first (screen readers announce it sooner). */
function describedBy(name: string, error?: string, hint?: string): string | undefined {
  const ids = [error && `${name}-error`, hint && `${name}-hint`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/* ------------------------------- text inputs ------------------------------- */

export function TextInput({
  name,
  label,
  error,
  hint,
  required = false,
  type = "text",
  defaultValue,
  autoComplete,
  placeholder,
  maxLength,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "date";
  defaultValue?: string;
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <Field label={label} name={name} error={error} hint={hint} required={required}>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={`${inputBase} ${borderFor(Boolean(error))}`}
      />
    </Field>
  );
}

export function TextArea({
  name,
  label,
  error,
  hint,
  required = false,
  defaultValue,
  rows = 3,
  maxLength = 2000,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <Field label={label} name={name} error={error} hint={hint} required={required}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={`${inputBase} ${borderFor(Boolean(error))} resize-y`}
      />
    </Field>
  );
}

/* -------------------------------- radio group ------------------------------ */

/**
 * Radio group in a <fieldset> with a <legend>.
 *
 * The fieldset is what tells a screen reader that these options belong together —
 * without it, each radio is announced with only its own label and the question is
 * lost. Used for every mutually-exclusive choice in the enrollment agreement (ESA
 * election, immunization status, media release), all of which the source PDF prints
 * as checkboxes but which are semantically exclusive.
 */
export function RadioGroup({
  name,
  legend,
  options,
  error,
  hint,
  defaultValue,
  required = true,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string; description?: string }[];
  error?: string;
  hint?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <fieldset
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(name, error, hint)}
      className="flex flex-col gap-2"
    >
      <legend className="text-sm font-semibold text-navy-900">
        {legend}
        {required ? (
          <span className="ml-1 text-crest-red-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      {hint ? (
        <p id={`${name}-hint`} className="text-sm text-ink-subtle">
          {hint}
        </p>
      ) : null}

      <div
        className={`flex flex-col gap-2 rounded-lg ${
          error ? "border border-crest-red-600 p-3" : ""
        }`}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-3.5 transition-colors hover:border-navy-300 has-checked:border-navy-600 has-checked:bg-navy-50"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              required={required}
              defaultChecked={defaultValue === option.value}
              className="mt-0.5 h-4 w-4 shrink-0 accent-navy-800"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                {option.label}
              </span>
              {option.description ? (
                <span className="mt-0.5 block text-sm text-ink-subtle">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>

      {error ? (
        <p id={`${name}-error`} className="text-sm font-medium text-crest-red-600">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/* --------------------------------- checkbox -------------------------------- */

export function Checkbox({
  name,
  label,
  error,
  defaultChecked = false,
  required = false,
}: {
  name: string;
  label: ReactNode;
  error?: string;
  defaultChecked?: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3.5 transition-colors hover:border-navy-300 has-checked:border-navy-600 has-checked:bg-navy-50 ${
          error ? "border-crest-red-600" : "border-line"
        }`}
      >
        <input
          id={name}
          name={name}
          type="checkbox"
          value="true"
          required={required}
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-navy-800"
        />
        <span className="text-sm leading-relaxed text-ink">{label}</span>
      </label>
      {error ? (
        <p id={`${name}-error`} className="text-sm font-medium text-crest-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------- select --------------------------------- */

export function Select({
  name,
  label,
  options,
  error,
  hint,
  required = false,
  defaultValue,
  placeholder = "Choose one…",
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} name={name} error={error} hint={hint} required={required}>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={`${inputBase} ${borderFor(Boolean(error))}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/* ------------------------------ form-level error --------------------------- */

/**
 * Form-level message in an aria-live region, so a screen reader announces it on
 * arrival rather than leaving the user to re-read the page hunting for what went
 * wrong.
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg border border-crest-red-100 bg-crest-red-50 px-4 py-3 text-sm font-medium text-crest-red-700"
    >
      {message}
    </div>
  );
}
