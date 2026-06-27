"use client";

import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { CalendarIcon, PlusIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { COUNTRIES, STATES_AND_UNION_TERRITORIES } from "../constants";
import { createPostMutation } from "../server/posts.mutations";
import { getBoardsForLocation, getDistrictsForState } from "../utils";

type SubmitStatus =
  | {
      kind: "idle";
      message: string;
    }
  | {
      kind: "success";
      message: string;
    }
  | {
      kind: "error";
      message: string;
    };

const FIELD_IDS = {
  title: "post-title",
  description: "post-description",
  evidenceMode: "post-evidence-mode",
  evidenceLink: "post-evidence-link",
  evidenceFile: "post-evidence-file",
  country: "post-country",
  state: "post-state",
  district: "post-district",
  board: "post-board",
  timestamp: "post-timestamp",
};

function fieldLabelId(fieldId: string) {
  return `${fieldId}-label`;
}

export function PostCreationPane({ hideLauncher = false }: { hideLauncher?: boolean }) {
  return (
    <SidebarProvider
      className="contents"
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "420px",
        } as React.CSSProperties
      }
    >
      <PostCreationPaneForm hideLauncher={hideLauncher} />
    </SidebarProvider>
  );
}

function PostCreationPaneForm({ hideLauncher }: { hideLauncher: boolean }) {
  const createPostServer = useServerFn(createPostMutation);
  const { isMobile, open, openMobile, setOpen, setOpenMobile } = useSidebar();
  const [selectedState, setSelectedState] = React.useState("");
  const [selectedDistrict, setSelectedDistrict] = React.useState("");
  const [selectedBoard, setSelectedBoard] = React.useState("");
  const [evidenceMode, setEvidenceMode] = React.useState<"link" | "file">("link");
  const [fileEvidenceType, setFileEvidenceType] = React.useState<"pdf" | "docx" | "image">("image");
  const [selectedEvidenceFileName, setSelectedEvidenceFileName] = React.useState("");
  const [selectedTimestamp, setSelectedTimestamp] = React.useState("");
  const [status, setStatus] = React.useState<SubmitStatus>({
    kind: "idle",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const evidenceFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const launcherRef = React.useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const wasPaneOpenRef = React.useRef(false);
  const isPaneOpen = isMobile ? openMobile : open;

  const boards = React.useMemo(
    () =>
      getBoardsForLocation({
        country: "india",
        state: selectedState,
        district: selectedDistrict,
      }),
    [selectedDistrict, selectedState],
  );
  const districts = React.useMemo(() => getDistrictsForState(selectedState), [selectedState]);

  React.useEffect(() => {
    if (!isPaneOpen) {
      return;
    }

    closeButtonRef.current?.focus();
  }, [isPaneOpen]);

  const resetPostCreationForm = React.useCallback(() => {
    formRef.current?.reset();
    setSelectedState("");
    setSelectedDistrict("");
    setSelectedBoard("");
    setEvidenceMode("link");
    setFileEvidenceType("image");
    setSelectedEvidenceFileName("");
    setSelectedTimestamp("");
    setStatus({
      kind: "idle",
      message: "",
    });
    setIsSubmitting(false);
  }, []);

  React.useEffect(() => {
    if (wasPaneOpenRef.current && !isPaneOpen) {
      resetPostCreationForm();
    }

    wasPaneOpenRef.current = isPaneOpen;
  }, [isPaneOpen, resetPostCreationForm]);

  React.useEffect(() => {
    if (!boards.some((board) => board.id === selectedBoard)) {
      setSelectedBoard("");
    }
  }, [boards, selectedBoard]);

  function openPane() {
    if (isMobile) {
      setOpenMobile(true);
    } else {
      setOpen(true);
    }
    setStatus({
      kind: "idle",
      message: "",
    });
  }

  function closePane() {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
    window.requestAnimationFrame(() => {
      launcherRef.current?.focus();
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({
      kind: "idle",
      message: "",
    });

    const form = event.currentTarget;
    const formData = new FormData(form);

    formData.set("country", "india");
    formData.set("state", selectedState);
    formData.set("district", selectedDistrict);
    formData.set("board", selectedBoard);
    formData.set("evidenceType", evidenceMode === "link" ? "link" : fileEvidenceType);
    formData.set("timestamp", selectedTimestamp);

    const result = await createPostServer({
      data: formData,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setStatus({
        kind: "error",
        message: result.message,
      });
      return;
    }

    form.reset();
    resetPostCreationForm();
    setStatus({
      kind: "success",
      message: "Post created.",
    });
  }

  return (
    <>
      {hideLauncher ? null : (
        <Button
          ref={launcherRef}
          aria-expanded={isPaneOpen}
          aria-controls="post-creation-pane"
          aria-label="Create post"
          className="fixed bottom-6 left-1/2 z-20 size-14 -translate-x-1/2 rounded-full border border-border bg-background! text-foreground shadow-lg shadow-foreground/10 hover:bg-muted!"
          size="icon"
          type="button"
          variant="outline"
          onClick={openPane}
        >
          <PlusIcon aria-hidden="true" />
        </Button>
      )}

      <Sidebar
        aria-hidden={!isPaneOpen}
        aria-labelledby="post-creation-title"
        className="inset-y-4 data-[side=right]:inset-y-4 data-[side=right]:right-4 z-30 h-auto data-[side=right]:h-auto w-[min(420px,calc(100dvw-2rem))] overflow-hidden rounded-lg! border! border-border! bg-background! p-0 shadow-xl! shadow-foreground/10! **:data-[slot=sidebar-inner]:rounded-lg! **:data-[slot=sidebar-inner]:border-0! **:data-[slot=sidebar-inner]:bg-background! **:data-[slot=sidebar-inner]:shadow-none! **:data-[slot=sidebar-inner]:ring-0!"
        collapsible="offcanvas"
        id="post-creation-pane"
        side="right"
        style={
          {
            "--sidebar-width": "min(420px, calc(100dvw - 2rem))",
          } as React.CSSProperties
        }
        variant="floating"
      >
        <SidebarHeader className="border-border border-b bg-background px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-semibold leading-tight" id="post-creation-title">
                Create post
              </h1>
              <p className="text-muted-foreground text-sm">
                Record an incident with evidence, location, and ministry board.
              </p>
            </div>
            <Button
              ref={closeButtonRef}
              aria-label="Close post creation"
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={closePane}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
        </SidebarHeader>

        <form ref={formRef} className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <SidebarContent className="bg-background px-5 py-4">
            <FieldGroup>
              {status.message ? (
                <p
                  className={
                    status.kind === "error"
                      ? "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm"
                      : "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
                  }
                  role={status.kind === "error" ? "alert" : "status"}
                >
                  {status.message}
                </p>
              ) : null}

              <Field>
                <FieldLabel htmlFor={FIELD_IDS.title}>Title</FieldLabel>
                <Input id={FIELD_IDS.title} maxLength={160} name="title" required />
              </Field>

              <Field>
                <FieldLabel htmlFor={FIELD_IDS.description}>Description</FieldLabel>
                <Textarea id={FIELD_IDS.description} name="description" required />
              </Field>

              <Field>
                <FieldLabel id={fieldLabelId(FIELD_IDS.evidenceMode)}>Evidence type</FieldLabel>
                <Select
                  value={evidenceMode}
                  onValueChange={(value) => {
                    const nextMode = value === "file" ? "file" : "link";

                    setEvidenceMode(nextMode);
                    if (nextMode === "link") {
                      setSelectedEvidenceFileName("");
                    }
                  }}
                >
                  <SelectTrigger
                    aria-labelledby={`${fieldLabelId(FIELD_IDS.evidenceMode)} ${FIELD_IDS.evidenceMode}`}
                    className="w-full"
                    id={FIELD_IDS.evidenceMode}
                  >
                    <SelectValue placeholder="Select evidence type">
                      {evidenceTypeLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="file">Document or image</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {evidenceMode === "link" ? (
                <Field>
                  <FieldLabel htmlFor={FIELD_IDS.evidenceLink}>Evidence link</FieldLabel>
                  <Input
                    id={FIELD_IDS.evidenceLink}
                    name="evidence"
                    placeholder="https://..."
                    required
                    type="url"
                  />
                </Field>
              ) : (
                <>
                  <Field>
                    <FieldLabel id={fieldLabelId(FIELD_IDS.evidenceFile)}>Evidence file</FieldLabel>
                    <button
                      aria-labelledby={`${fieldLabelId(FIELD_IDS.evidenceFile)} ${FIELD_IDS.evidenceFile}-action ${FIELD_IDS.evidenceFile}-display`}
                      className="flex h-10 w-full min-w-0 cursor-pointer items-center overflow-hidden rounded-md border border-input bg-background text-base text-foreground outline-none transition-[background-color,border-color,box-shadow] hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm"
                      type="button"
                      onClick={() => {
                        evidenceFileInputRef.current?.click();
                      }}
                    >
                      <span
                        className="inline-flex h-full shrink-0 items-center px-3 font-medium"
                        id={`${FIELD_IDS.evidenceFile}-action`}
                      >
                        Choose file
                      </span>
                      <Separator
                        aria-hidden="true"
                        className="self-stretch"
                        data-testid="evidence-file-divider"
                        orientation="vertical"
                      />
                      <span
                        id={`${FIELD_IDS.evidenceFile}-display`}
                        className={cn(
                          "min-w-0 flex-1 truncate px-3",
                          selectedEvidenceFileName ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {selectedEvidenceFileName || "No file chosen"}
                      </span>
                    </button>
                    <Input
                      ref={evidenceFileInputRef}
                      accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
                      className="sr-only"
                      id={FIELD_IDS.evidenceFile}
                      name="evidenceFile"
                      required
                      tabIndex={-1}
                      type="file"
                      aria-hidden="true"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];

                        if (!file) {
                          setSelectedEvidenceFileName("");
                          return;
                        }

                        setSelectedEvidenceFileName(file.name);

                        if (file.type === "application/pdf") {
                          setFileEvidenceType("pdf");
                        } else if (
                          file.type ===
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        ) {
                          setFileEvidenceType("docx");
                        } else {
                          setFileEvidenceType("image");
                        }
                      }}
                    />
                    <input name="evidence" type="hidden" value="local-upload" />
                  </Field>
                  <FieldDescription>
                    Accepted files: PDF, DOCX, PNG, JPEG, or WebP up to 10 MB.
                  </FieldDescription>
                </>
              )}

              <Field>
                <FieldLabel id={fieldLabelId(FIELD_IDS.country)}>Country</FieldLabel>
                <Select value="india" disabled>
                  <SelectTrigger
                    aria-labelledby={`${fieldLabelId(FIELD_IDS.country)} ${FIELD_IDS.country}`}
                    className="w-full"
                    id={FIELD_IDS.country}
                  >
                    <SelectValue>{(value) => optionName(COUNTRIES, value, "India")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel id={fieldLabelId(FIELD_IDS.state)}>State or union territory</FieldLabel>
                <Select
                  value={selectedState}
                  onValueChange={(value) => {
                    setSelectedState(value ?? "");
                    setSelectedDistrict("");
                    setSelectedBoard("");
                  }}
                >
                  <SelectTrigger
                    aria-labelledby={`${fieldLabelId(FIELD_IDS.state)} ${FIELD_IDS.state}`}
                    className="w-full"
                    id={FIELD_IDS.state}
                  >
                    <SelectValue placeholder="None">
                      {(value) => optionName(STATES_AND_UNION_TERRITORIES, value, "None")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      <SelectItem value="">None</SelectItem>
                      {STATES_AND_UNION_TERRITORIES.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel id={fieldLabelId(FIELD_IDS.district)}>District</FieldLabel>
                <Select
                  disabled={!selectedState}
                  value={selectedDistrict}
                  onValueChange={(value) => {
                    setSelectedDistrict(value ?? "");
                  }}
                >
                  <SelectTrigger
                    aria-labelledby={`${fieldLabelId(FIELD_IDS.district)} ${FIELD_IDS.district}`}
                    className="w-full"
                    id={FIELD_IDS.district}
                  >
                    <SelectValue placeholder="None">
                      {(value) => optionName(districts, value, "None")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      <SelectItem value="">None</SelectItem>
                      {districts.map((district) => (
                        <SelectItem key={district.id} value={district.id}>
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel id={fieldLabelId(FIELD_IDS.board)}>Board</FieldLabel>
                <Select
                  required
                  value={selectedBoard}
                  onValueChange={(value) => {
                    setSelectedBoard(value ?? "");
                  }}
                >
                  <SelectTrigger
                    aria-labelledby={`${fieldLabelId(FIELD_IDS.board)} ${FIELD_IDS.board}`}
                    className="w-full"
                    id={FIELD_IDS.board}
                  >
                    <SelectValue placeholder="Select a board">
                      {(value) => optionName(boards, value, "Select a board")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {boards.map((board) => (
                        <SelectItem key={board.id} value={board.id}>
                          {board.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <DateTimePicker
                id={FIELD_IDS.timestamp}
                value={selectedTimestamp}
                onChange={setSelectedTimestamp}
              />
              <input name="timestamp" required type="hidden" value={selectedTimestamp} />

              {status.kind === "error" ? <FieldError>{status.message}</FieldError> : null}
            </FieldGroup>
          </SidebarContent>

          <SidebarFooter className="items-center border-border border-t bg-background px-5 py-4">
            <div className="flex justify-center">
              <Button className="min-w-40" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating post" : "Create post"}
              </Button>
            </div>
          </SidebarFooter>
        </form>
      </Sidebar>
    </>
  );
}

function optionName(
  options: readonly { id: string; name: string }[],
  value: unknown,
  fallback: string,
) {
  if (typeof value !== "string") {
    return fallback;
  }

  return options.find((option) => option.id === value)?.name ?? fallback;
}

function evidenceTypeLabel(value: unknown) {
  if (value === "file") {
    return "Document or image";
  }

  if (value === "link") {
    return "Link";
  }

  return "Select evidence type";
}

function DateTimePicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsedValue = parseDateTimeValue(value);
  const [dateOpen, setDateOpen] = React.useState(false);
  const [time, setTime] = React.useState(() => parsedValue?.time ?? currentTimeValue());

  React.useEffect(() => {
    setTime(parsedValue?.time ?? currentTimeValue());
  }, [parsedValue?.time]);

  const selectedDate = parsedValue?.date;
  const selectedDateValue = selectedDate ? formatDateValue(selectedDate) : "";

  function updateDate(date: Date | undefined) {
    if (!date) {
      return;
    }

    onChange(`${formatDateValue(date)}T${time}`);
    setDateOpen(false);
  }

  function updateTime(nextTime: string) {
    setTime(nextTime);

    if (selectedDateValue) {
      onChange(`${selectedDateValue}T${nextTime}`);
    }
  }

  return (
    <FieldGroup className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
      <Field>
        <FieldLabel id={fieldLabelId(`${id}-date`)}>Date</FieldLabel>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger
            id={`${id}-date`}
            render={(triggerProps) => (
              <Button
                {...triggerProps}
                aria-labelledby={`${fieldLabelId(`${id}-date`)} ${id}-date`}
                className="h-10 w-full justify-between rounded-md font-normal"
                type="button"
                variant="outline"
              >
                {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                <CalendarIcon aria-hidden="true" />
              </Button>
            )}
          />
          <PopoverContent align="start" className="w-auto overflow-hidden bg-popover! p-0">
            <Calendar
              mode="single"
              captionLayout="dropdown"
              onSelect={updateDate}
              {...(selectedDate
                ? {
                    defaultMonth: selectedDate,
                    selected: selectedDate,
                  }
                : {})}
            />
          </PopoverContent>
        </Popover>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-time`}>Time</FieldLabel>
        <Input
          className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          id={`${id}-time`}
          step="1"
          type="time"
          value={time}
          onChange={(event) => updateTime(event.currentTarget.value)}
        />
      </Field>
    </FieldGroup>
  );
}

function parseDateTimeValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}(?::\d{2})?)$/.exec(value);

  if (!match) {
    return null;
  }

  const year = match[1];
  const month = match[2];
  const day = match[3];
  const time = match[4];

  if (!year || !month || !day || !time) {
    return null;
  }

  return {
    date: new Date(Number(year), Number(month) - 1, Number(day)),
    day: Number(day),
    month: Number(month),
    time,
    year: Number(year),
  };
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function currentTimeValue() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}
