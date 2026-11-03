// Small display components and their fallbacks for missing data.

import { fireEvent, render, screen } from "@testing-library/react";
import { Delta } from "@/components/ui/Delta";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { RankBadge } from "@/components/ui/RankBadge";

const MINUS = "−";

describe("RankBadge", () => {
  it("says Unranked without a rank", () => {
    render(<RankBadge rank={null} />);
    expect(screen.getByText("Unranked")).toBeInTheDocument();
  });

  it("shows the badge image and the rank name", () => {
    const { container } = render(
      <RankBadge rank={{ name: "Oracle", numeral: "III", imageUrl: "https://assets-bucket.deadlock-api.com/ranks/oracle.webp" }} />,
    );
    expect(container).toHaveTextContent("Oracle III");
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("falls back to the brass diamond when the image fails", () => {
    const { container } = render(
      <RankBadge rank={{ name: "Oracle", numeral: "III", imageUrl: "https://assets-bucket.deadlock-api.com/ranks/oracle.webp" }} />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container).toHaveTextContent("Oracle III");
  });
});

describe("PlayerAvatar", () => {
  it("shows initials when there is no avatar", () => {
    const { container } = render(<PlayerAvatar avatarUrl={null} initials="YO" sizes="40px" />);
    expect(container).toHaveTextContent("YO");
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("falls back to initials when the avatar fails to load", () => {
    const { container } = render(
      <PlayerAvatar avatarUrl="https://avatars.steamstatic.com/abc_full.jpg" initials="YO" sizes="40px" />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container).toHaveTextContent("YO");
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});

describe("Delta", () => {
  it("shows 'new' when there's nothing to compare", () => {
    render(<Delta value={null} />);
    expect(screen.getByText("new")).toBeInTheDocument();
  });

  it("marks rises and falls for screen readers", () => {
    const { container, rerender } = render(<Delta value={1.8} />);
    expect(container).toHaveTextContent("▲ up +1.8");
    rerender(<Delta value={-2} />);
    expect(container).toHaveTextContent(`▼ down ${MINUS}2.0`);
  });

  it("shows no arrow for a change that rounds to zero", () => {
    const { container } = render(<Delta value={0.04} />);
    expect(container).toHaveTextContent(/^0\.0$/);
  });
});
