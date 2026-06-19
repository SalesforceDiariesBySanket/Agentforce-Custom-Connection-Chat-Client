import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResponseFormat } from "../../types";
import { useTheme, themeConfig } from "../../hooks";
import {
  FORMAT_CHOICES_WITH_IMAGES,
  FORMAT_TEXT_CHOICES,
  ImageChoicesData,
  resolveFormatName,
  TextChoicesData,
} from "./formatRegistry";

interface ResponseFormatRendererProps {
  format: ResponseFormat;
  onSelect?: (value: string) => void;
  disabled?: boolean;
}

export const ResponseFormatRenderer: React.FC<ResponseFormatRendererProps> = ({
  format,
  onSelect,
  disabled,
}) => {
  const base = resolveFormatName(format.name);
  if (base === FORMAT_TEXT_CHOICES) {
    return (
      <TextChoices
        data={format.data as TextChoicesData}
        onSelect={onSelect}
        disabled={disabled}
      />
    );
  }
  if (base === FORMAT_CHOICES_WITH_IMAGES) {
    return (
      <ChoicesWithImages
        data={format.data as ImageChoicesData}
        onSelect={onSelect}
        disabled={disabled}
      />
    );
  }
  return null;
};

const Prompt: React.FC<{ text?: string }> = ({ text }) => {
  if (!text) return null;
  return (
    <div className="prose-sm mb-2 max-w-full break-words text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
};

const TextChoices: React.FC<{
  data: TextChoicesData;
  onSelect?: (value: string) => void;
  disabled?: boolean;
}> = ({ data, onSelect, disabled }) => {
  const { theme } = useTheme();
  const styles = themeConfig[theme];

  return (
    <div>
      <Prompt text={data.message} />
      <div className="flex flex-col gap-2">
        {data.choices.map((choice, index) => (
          <button
            key={`${choice}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.(choice)}
            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-200 ${styles.border} ${styles.secondary} ${styles.secondaryText} ${styles.secondaryHover} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
};

const ChoicesWithImages: React.FC<{
  data: ImageChoicesData;
  onSelect?: (value: string) => void;
  disabled?: boolean;
}> = ({ data, onSelect, disabled }) => {
  const { theme } = useTheme();
  const styles = themeConfig[theme];

  return (
    <div>
      <Prompt text={data.message} />
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {data.choices.map((choice, index) => (
          <div
            key={`${choice.title}-${index}`}
            className={`flex w-40 flex-shrink-0 flex-col overflow-hidden rounded-lg border bg-white ${styles.border}`}
          >
            {choice.imageUrl ? (
              <img
                src={choice.imageUrl}
                alt={choice.title}
                className="h-24 w-full bg-gray-100 object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <div className="flex flex-1 flex-col gap-2 p-2">
              <span className="line-clamp-2 text-sm font-medium text-gray-800">
                {choice.title}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect?.(choice.actionText || choice.title)}
                className={`mt-auto rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-200 ${styles.primary} ${styles.primaryText} ${styles.primaryHover} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {choice.actionText || "Select"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
