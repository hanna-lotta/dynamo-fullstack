import * as z from "zod";
//import type { Movie, Review } from "./types.js";

// Schema för POST-body (utan movieId och reviewId)
export const moviePostSchema = z.object({
	title: z.string().min(2).max(100),
	director: z.string().min(2).max(100),
	img: z.string().min(2).max(100),
	year: z.number().min(1888).max(new Date().getFullYear())
});


const movieIdRegex = /^movie[0-9]+$/;
const reviewIdRegex = /^review[0-9]+$/;

export const MovieSchema = z.object({
	movieId: z.string().regex(movieIdRegex),  // m1, m2, m11 osv.
	reviewId: z.literal('meta'),  // måste vara 'meta' för Movie-objekt
	year: z.number().gte(1888),  // 1888 eller senare
	director: z.string().min(1),
	img: z.string().url(),  // måste vara en URL
	title: z.string().min(1)
});

export type Movie = z.infer<typeof MovieSchema>;

export const ReviewSchema = z.object({
	movieId: z.string().regex(movieIdRegex),  // måste matcha ett giltigt movieId
	reviewId: z.string().regex(reviewIdRegex),  // måste matcha ett giltigt reviewId
	rating: z.number().gte(0).lte(5),  // mellan 0 och 5
	name: z.string().min(2).max(100)
});

export type Review = z.infer<typeof ReviewSchema>;

export const MovieArraySchema = z.array(z.union([MovieSchema, ReviewSchema]));

export function isMovie(item: Movie | Review): item is Movie {
	try {
		MovieSchema.parse(item)
		return true
	} catch {
		return false
	}
}

export function isReview(item: Movie | Review): item is Review {
	try {
		ReviewSchema.parse(item)
		return true
	} catch {
		return false
	}
}