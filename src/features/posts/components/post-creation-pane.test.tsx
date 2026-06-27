import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PostCreationPane } from "./post-creation-pane";

const createPostMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-start")>();

  return {
    ...actual,
    useServerFn: () => createPostMock,
  };
});

describe("PostCreationPane", () => {
  it("opens a labeled post creation pane from the center-bottom create button", () => {
    render(<PostCreationPane />);

    const createButton = screen.getByRole("button", {
      name: "Create post",
    });

    expect(createButton.className).toContain("left-1/2");
    expect(createButton.className).toContain("bottom-6");

    fireEvent.click(createButton);

    expect(
      screen.getByRole("heading", {
        name: "Create post",
      }),
    ).toBeDefined();
    expect(screen.getByLabelText("Title")).toBeDefined();
    expect(screen.getByLabelText("Description")).toBeDefined();
    expect(screen.getByLabelText("Evidence type")).toBeDefined();
    expect(screen.getByLabelText("Country")).toBeDefined();
    expect(screen.getByLabelText("State or union territory")).toBeDefined();
    expect(screen.getByLabelText("District")).toBeDefined();
    expect(screen.getByLabelText("Board")).toBeDefined();
    expect(screen.getByLabelText("Time")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBe(null);
    expect(document.querySelector('input[type="datetime-local"]')).toBe(null);
  });

  it("hides the center-bottom create button when the launcher is disabled", () => {
    render(<PostCreationPane hideLauncher />);

    expect(screen.queryByRole("button", { name: "Create post" })).toBe(null);
  });

  it("does not open custom controls from the label above the visible field", async () => {
    const user = userEvent.setup();
    render(<PostCreationPane />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create post",
      }),
    );

    await user.click(screen.getByText("State or union territory"));
    expect(screen.queryByRole("option", { name: "Tamil Nadu" })).toBe(null);

    await user.click(screen.getByText("Date"));
    expect(screen.queryByRole("grid")).toBe(null);

    await user.click(screen.getByRole("combobox", { name: "Evidence type" }));
    await user.click(await screen.findByRole("option", { name: "Document or image" }));

    const fileInputClick = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});

    await user.click(screen.getByText("Evidence file"));
    expect(fileInputClick).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Evidence file Choose file No file chosen" }),
    );
    expect(fileInputClick).toHaveBeenCalledTimes(1);

    fileInputClick.mockRestore();
  });

  it("shows a divided file picker with a filename display area", async () => {
    const user = userEvent.setup();
    render(<PostCreationPane />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create post",
      }),
    );

    await user.click(screen.getByRole("combobox", { name: "Evidence type" }));
    await user.click(await screen.findByRole("option", { name: "Document or image" }));

    const fileInput = document.querySelector("#post-evidence-file") as HTMLInputElement;
    const file = new File(["evidence"], "road-damage.png", { type: "image/png" });

    expect(screen.getByText("Choose file")).toBeDefined();
    expect(screen.getByText("No file chosen")).toBeDefined();
    expect(screen.getByTestId("evidence-file-divider")).toBeDefined();

    await user.upload(fileInput, file);

    expect(fileInput.files?.[0]?.name).toBe("road-damage.png");
    expect(screen.getByText("road-damage.png")).toBeDefined();
    expect(screen.queryByText("No file chosen")).toBe(null);
  });

  it("resets form state when the pane closes", async () => {
    const user = userEvent.setup();
    render(<PostCreationPane />);

    await user.click(screen.getByRole("button", { name: "Create post" }));

    const titleInput = screen.getByLabelText("Title");
    const descriptionInput = screen.getByLabelText("Description");
    const stateSelect = screen.getByRole("combobox", { name: "State or union territory" });

    await user.type(titleInput, "Damaged road near school");
    await user.type(descriptionInput, "Large pothole blocks the crossing.");
    await user.click(stateSelect);
    await user.click(await screen.findByRole("option", { name: "Tamil Nadu" }));

    expect(titleInput).toHaveProperty("value", "Damaged road near school");
    expect(descriptionInput).toHaveProperty("value", "Large pothole blocks the crossing.");
    expect(stateSelect.textContent).toContain("Tamil Nadu");

    await user.click(screen.getByRole("button", { name: "Close post creation" }));
    await user.click(screen.getByRole("button", { name: "Create post" }));

    expect(screen.getByLabelText("Title")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Description")).toHaveProperty("value", "");
    expect(screen.getByRole("combobox", { name: "Evidence type" }).textContent).toContain("Link");
    expect(
      screen.getByRole("combobox", { name: "State or union territory" }).textContent,
    ).toContain("None");
    expect(screen.getByRole("combobox", { name: "District" })).toHaveProperty("disabled", true);
  });

  it("derives boards and districts from country, state, and district selection", async () => {
    const user = userEvent.setup();
    render(<PostCreationPane />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create post",
      }),
    );

    const boardSelect = screen.getByRole("combobox", { name: "Board" });
    const districtSelect = screen.getByRole("combobox", { name: "District" });
    const stateSelect = screen.getByRole("combobox", { name: "State or union territory" });

    await user.click(boardSelect);
    expect(await screen.findByRole("option", { name: "Ministry of Home Affairs" })).toBeDefined();
    await user.keyboard("{Escape}");
    expect(districtSelect).toHaveProperty("disabled", true);

    await user.click(stateSelect);
    await user.click(await screen.findByRole("option", { name: "Tamil Nadu" }));

    expect(stateSelect.textContent).toContain("Tamil Nadu");
    expect(stateSelect.textContent).not.toContain("tamil-nadu");
    expect(districtSelect).toHaveProperty("disabled", false);
    await user.click(districtSelect);
    expect(await screen.findByRole("option", { name: "Chennai" })).toBeDefined();
    await user.keyboard("{Escape}");

    await user.click(boardSelect);
    expect(
      await screen.findByRole("option", { name: "Health and Family Welfare Department" }),
    ).toBeDefined();
    expect(screen.queryByRole("option", { name: "Ministry of Home Affairs" })).toBe(null);
    await user.keyboard("{Escape}");

    await user.click(districtSelect);
    await user.click(await screen.findByRole("option", { name: "Chennai" }));

    expect(districtSelect.textContent).toContain("Chennai");
    await user.click(boardSelect);
    expect(
      await screen.findByRole("option", { name: "Health and Family Welfare Department" }),
    ).toBeDefined();
    await user.click(
      await screen.findByRole("option", { name: "Health and Family Welfare Department" }),
    );

    expect(boardSelect.textContent).toContain("Health and Family Welfare Department");
    expect(boardSelect.textContent).not.toContain("tamil-nadu-health-and-family-welfare");
  });
});
