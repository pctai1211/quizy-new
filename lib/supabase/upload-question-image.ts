"use client";

import { createClient } from "@/lib/supabase/client";

export async function uploadQuestionImage(file: File): Promise<string> {
    const supabase = createClient();

    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
        .from("question-images")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) throw error;

    const { data } = supabase.storage
        .from("question-images")
        .getPublicUrl(fileName);

    return data.publicUrl;
}

export async function deleteQuestionImage(url: string) {
    const supabase = createClient();
    const fileName = url.split("/").pop();
    if (!fileName) return;
    await supabase.storage.from("question-images").remove([fileName]);
}