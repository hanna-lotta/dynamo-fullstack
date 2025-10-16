
export type Review = {
	movieId: string;
	reviewId: string;
	rating: number;
	name: string;
}

export type Movie = {
	movieId: string;
	title: string;
	director: string;
	img: string;
	reviewId: string;
	year: number;
}
 
export type DynamoMovie = {
  movieId: { S: string };
  title?: { S: string };
  director?: { S: string };
  img?: { S: string };
  reviewId: { S: string };
  year?: { N: string };
};

export interface ErrorMessage {
	error: string;
}