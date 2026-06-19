import { ResponseFormat } from "../../types";

/**
 * Developer names of the AiResponseFormat metadata this client knows how to
 * render. These must match the response format developer names deployed to the
 * org (without the SURFACE_ACTION__ prefix or _{surfaceId} suffix).
 */
export const FORMAT_TEXT_CHOICES = "TextChoices";
export const FORMAT_CHOICES_WITH_IMAGES = "ChoicesWithImages";

const KNOWN_FORMATS = [FORMAT_TEXT_CHOICES, FORMAT_CHOICES_WITH_IMAGES];

/**
 * Maps a runtime response-format name to the base format this client renders.
 * The Agent API returns the format's full developer name, which KEEPS the
 * surface-id suffix (e.g. "TextChoices_CustomChatClient01" is the base name
 * "TextChoices" + "_" + the surfaceId). Match on the base-name prefix so the
 * client works regardless of which surfaceId the org uses.
 */
export function resolveFormatName(rawName?: string | null): string | null {
  if (!rawName) return null;
  for (const known of KNOWN_FORMATS) {
    if (rawName === known || rawName.startsWith(`${known}_`)) {
      return known;
    }
  }
  return null;
}

export interface ImageChoice {
  title: string;
  imageUrl: string;
  actionText: string;
}

export interface TextChoicesData {
  message?: string;
  choices: string[];
}

export interface ImageChoicesData {
  message?: string;
  choices: ImageChoice[];
}

function isRenderable(format: ResponseFormat): boolean {
  const base = resolveFormatName(format.name);
  const data = format.data as { choices?: unknown } | null;
  if (!data || typeof data !== "object") return false;
  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) return false;

  if (base === FORMAT_TEXT_CHOICES) {
    return choices.every((choice) => typeof choice === "string");
  }
  if (base === FORMAT_CHOICES_WITH_IMAGES) {
    return choices.every(
      (choice) =>
        choice &&
        typeof choice === "object" &&
        typeof (choice as ImageChoice).title === "string"
    );
  }
  return false;
}

/** True when this client has a renderer for the format and the data is valid. */
export function isKnownFormat(format?: ResponseFormat | null): boolean {
  return (
    !!format && resolveFormatName(format.name) !== null && isRenderable(format)
  );
}
