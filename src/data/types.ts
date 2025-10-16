export type Movie = {
	movieId: string;
	title: string;
	director: string;
	img: string;
	reviewId: string;
	year: number;
}
export type Review = {
	movieId: string;
	reviewId: string;
	rating: number;
	name: string;
}