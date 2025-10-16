import express from 'express';
import type { Request, Response, Router } from 'express';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoMovie, ErrorMessage } from '../data/types.js';

import { moviePostSchema, ReviewSchema, MovieArraySchema, isReview } from '../data/validation.js';
import type { Movie, Review } from '../data/validation.js';




const router: Router = express.Router();
const accessKey: string = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey: string = process.env.AWS_SECRET_ACCESS_KEY || '';

console.log('AWS_ACCESS_KEY_ID:', accessKey ? `${accessKey.slice(0, 4)}...${accessKey.slice(-4)}` : 'MISSING');
console.log('AWS_SECRET_ACCESS_KEY:', secretAccessKey ? `${secretAccessKey.slice(0, 4)}...${secretAccessKey.slice(-4)}` : 'MISSING');

export type GetResult = Record<string, any> | undefined

// DynamoDB stuff - flyttas till annan fil
const client: DynamoDBClient = new DynamoDBClient({
	region: "eu-north-1",  // se till att använda den region som du använder för DynamoDB
	credentials: {
		accessKeyId: accessKey,
		secretAccessKey: secretAccessKey,
	},
});
const db: DynamoDBDocumentClient = DynamoDBDocumentClient.from(client);
const myTable: string = 'movies'



export type MovieIdParam = {
	movieId: string;
};



router.get('/:movieId', async (req: Request<MovieIdParam>, res: Response<Movie | ErrorMessage>) => {
	const movieId: string = req.params.movieId; // hämtar värdet på movieId från URL:en i en express route
	let getCommand = new GetCommand({
		TableName: myTable,
		Key: {
			movieId: movieId,
			reviewId: 'meta'
		}
	});
	const result: GetResult = await db.send(getCommand);
	const item: Movie | undefined | ErrorMessage = result.Item;
	console.log('Data from DynamoDB:', result);
	if (item) {
		res.send(item);
	} else {
		res.status(404).send({ error: 'Movie not found' });
	}
})


//type ScanResult = Array<Movie | undefined | ErrorMessage>;

router.get('/', async(_req: Request, res: Response<Movie[] | ErrorMessage>) => {
	let scanCommand = new ScanCommand({
		TableName: myTable
	})
	try {
		const result = await db.send(scanCommand);
		const items: DynamoMovie[] = (result.Items ?? []) as DynamoMovie[];

		console.log('Data from DynamoDB:', items);

		const moviesOnly = items
			.filter(item => item.reviewId.S === 'meta')
			.map(item => ({
				movieId: item.movieId.S,
				title: item.title?.S ?? '',
				director: item.director?.S ?? '',
				img: item.img?.S ?? '',
				reviewId: "meta" as const,
				year: item.year?.N ? Number(item.year.N) : 0
			}));
		if (moviesOnly && moviesOnly.length > 0)
			res.send(moviesOnly);
		else
			res.status(404).send({ error: 'No movies found' });
	} catch (error) {
		console.log('DynamoDB error:', error);
		res.status(500).send({ error: 'Database connection failed' });
	}
});

/*
movieId: string;
	title: string;
	director: string;
	img: string;
	reviewId: string;
	year: number;
*/

//POST
router.post('/:movieId', async (req: Request, res: Response<Movie | ErrorMessage>) => {
	const validation = moviePostSchema.safeParse(req.body);
	if (!validation.success) {
		res.status(400).send({ error: 'Invalid request body' });
		return;
	}
	const movieId = req.params.movieId;
	if (!movieId) {
		res.status(400).send({ error: 'movieId is required' });
		return; 
	}
	const { title, director, img, year } = validation.data;
	const newItem: Movie = {
		movieId,
		reviewId: 'meta',
		title,
		director,
		img,
		year
	};
	await db.send(new PutCommand({
		TableName: myTable,
		Item: newItem
	}));
	res.status(201).send(newItem);
});



// Delete route
router.delete('/:movieId', async (req: Request<MovieIdParam>, res: Response<Movie | ErrorMessage>) => {
	const movieId: string = req.params.movieId;
	const deleteResult = await db.send(new DeleteCommand({
		TableName: myTable,
		Key: { movieId: movieId, reviewId: 'meta' }, 
		ReturnValues: 'ALL_OLD'
	}));
	console.log('DELETE result Attributes:', deleteResult.Attributes);
	if (deleteResult.Attributes) {
    res.status(200).send(deleteResult.Attributes as Movie);
  } else {
    res.status(404).send({ error: 'Movie not found' });
  }
});


interface MovieUpdate {
	title: string;
	director: string;
	img: string;
	year: number;
}

// ändra en item/ PUT
router.put('/:movieId', async (req: Request<MovieIdParam>, res: Response<MovieUpdate | ErrorMessage>) => {
	const movieId: string = req.params.movieId;
	const validation = moviePostSchema.safeParse(req.body);
	if (!validation.success) {
		res.status(400).send({ error: 'Invalid request body' });
		return;
	}
	const { title, director, img, year } = validation.data;
	await db.send(new UpdateCommand({
		TableName: myTable,
		Key: { movieId: movieId, reviewId: 'meta' },
		UpdateExpression: 'SET title = :t, director = :dr, img = :i, #yr = :y',
		ExpressionAttributeNames: { '#yr': 'year' },
		ExpressionAttributeValues: {
			':t': title,
			':dr': director,
			':i': img,
			':y': year
		}
	}));
	const updatedMovie: MovieUpdate = { title, director, img, year };
	res.status(200).send(updatedMovie);
});

router.get('/:movieId/reviews', async (req: Request<MovieIdParam>, res: Response<Review[] | void>) => {
	const movieId: string = req.params.movieId
	const result = await db.send(new QueryCommand({

		TableName: myTable,
		KeyConditionExpression: 'movieId = :movieId', 
		ExpressionAttributeValues: {
			':movieId': movieId
		}
	}))
	console.log('QueryCommand result: ', result)

	try {
		let items = MovieArraySchema.parse(result.Items)
		const filtered: Review[] = items.filter(isReview) as Review[]
		res.send(filtered)
	} catch (error) {
		console.log('/movies/:id/reviews  - parse error: ', (error as Error).message)
		res.sendStatus(500)
	}
 });

 router.get('/:movieId/reviews/:reviewId', async (req: Request<MovieIdParam & { reviewId: string }>, res: Response<Review | ErrorMessage>) => {
	const movieId: string = req.params.movieId
	const reviewId: string = req.params.reviewId
	const result = await db.send(new GetCommand({
		TableName: myTable,
		Key: {
			movieId: movieId,
			reviewId: reviewId
		}
	}))
	console.log('GetCommand result: ', result)
	if (result.Item) {
		try {
			let item = ReviewSchema.parse(result.Item)
			res.send(item)
		} catch (error) {
			console.log('/movies/:id/reviews/:id  - parse error: ', (error as Error).message)
			res.sendStatus(500)
		}
	} else {
		res.status(404).send({ error: 'Review not found' })
	}
 });

 router.post('/:movieId/reviews', async (req: Request<MovieIdParam>, res: Response<Review | ErrorMessage>) => {
	const movieId: string = req.params.movieId
	const validation = ReviewSchema.safeParse(req.body)
	if (!validation.success) {
		res.status(400).send({ error: 'Invalid request body' })
		return
	}
	const { reviewId, rating, name } = validation.data
	const newItem: Review = {
		movieId,
		reviewId,
		rating,
		name
	}
	try {
		await db.send(new PutCommand({
			TableName: myTable,
			Item: newItem
		}))
		res.status(201).send(newItem)
	} catch (error) {
		console.log('/movies/:id/reviews  - put error: ', (error as Error).message)
		res.sendStatus(500)
	}
 });

 router.delete('/:movieId/reviews/:reviewId', async (req: Request<MovieIdParam & { reviewId: string }>, res: Response<Review | ErrorMessage>) => {
	const movieId: string = req.params.movieId
	const reviewId: string = req.params.reviewId
	try {
		const deleteResult = await db.send(new DeleteCommand({
			TableName: myTable,
			Key: { movieId: movieId, reviewId: reviewId },
			ReturnValues: 'ALL_OLD'
		}))
		console.log('DELETE result Attributes:', deleteResult.Attributes)
		if (deleteResult.Attributes) {
			try {
				let item = ReviewSchema.parse(deleteResult.Attributes)
				res.status(200).send(item)
			} catch (error) {
				console.log('/movies/:id/reviews/:id  - parse error: ', (error as Error).message)
				res.sendStatus(500)
			}
		} else {
			res.status(404).send({ error: 'Review not found' })
		}
	} catch (error) {
		console.log('/movies/:id/reviews/:id  - delete error: ', (error as Error).message)
		res.sendStatus(500)
	}
 });

 router.put('/:movieId/reviews/:reviewId', async (req: Request<MovieIdParam & { reviewId: string }>, res: Response<Review | ErrorMessage>) => {
	const movieId: string = req.params.movieId
	const reviewId: string = req.params.reviewId
	const validation = ReviewSchema.safeParse(req.body)
	if (!validation.success) {
		res.status(400).send({ error: 'Invalid request body' })
		return
	}
	const { rating, name } = validation.data
	try {
		await db.send(new UpdateCommand({
			TableName: myTable,
			Key: { movieId: movieId, reviewId: reviewId },
			UpdateExpression: 'SET rating = :r, #nm = :n',
			ExpressionAttributeNames: { '#nm': 'name' },
			ExpressionAttributeValues: {
				':r': rating,
				':n': name
			}
		}))
		const updatedReview: Review = { movieId, reviewId, rating, name }
		res.status(200).send(updatedReview)
	} catch (error) {
		console.log('/:movieId/reviews/:reviewId  - put error: ', (error as Error).message)
		res.sendStatus(500)
	}
 });



export default router;