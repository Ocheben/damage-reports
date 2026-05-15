"use client";

import { useState } from "react";

import type { Photo } from "../constants";

export function usePhotoDraft({
  onCommit,
}: {
  onCommit: (photo: Photo) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");

  const reset = () => {
    setUrl("");
    setCaption("");
  };

  const startAdding = () => setAdding(true);

  const cancel = () => {
    setAdding(false);
    reset();
  };

  const commit = () => {
    if (!url) return;
    onCommit({ url, caption });
    setAdding(false);
    reset();
  };

  return {
    adding,
    url,
    setUrl,
    caption,
    setCaption,
    startAdding,
    cancel,
    commit,
  };
}
