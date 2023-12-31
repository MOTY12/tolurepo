import { Application, json, urlencoded, Response, Request, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import hpp from 'hpp';
import compression from 'compression';
import cookieSession from 'cookie-session';
import HTTP_STATUS from 'http-status-codes';
import Logger from 'bunyan';
import { config } from '@root/config';
import { Server } from 'socket.io';
// import { createClient } from 'redis';
// import { createAdapter } from '@socket.io/redis-adapter';
import userRouter from './routes';
import { cloudinaryConfig } from './config/cloudinary';
// import applicationRoutes from '@root/routes';
import { CustomError, IErrorResponse } from '@global/helpers/error-handler';

const SERVER_PORT = process.env.PORT || 4000
const log: Logger = config.createLogger('server');
dotenv.config();
import cron from 'node-cron';

export class MainServer {
	private app: Application;

	constructor(app: Application) {
		this.app = app;
	}

	public start(): void {
		this.securityMiddlewares(this.app);
		this.standardMiddlewares(this.app);
		this.testMiddlewares(this.app);
		this.routeMiddlewares(this.app);
		this.globalErrorHandler(this.app);
		this.startServer(this.app);
	}

	private securityMiddlewares(app: Application): void {
		app.use(
			cors({
				origin: '*',
				credentials: true,
				optionsSuccessStatus: HTTP_STATUS.OK,
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
			})
		);
		app.use(helmet());
		app.use(hpp());
		app.use(
			cookieSession({
				name: 'session',
				keys: [config.SECRET_KEY_ONE!, config.SECRET_KEY_TWO!],
				maxAge: 24 * 60 * 60 * 1000, // 24 hours
				secure: config.NODE_ENV !== 'development'
			})
		);
	}

	private standardMiddlewares(app: Application): void {
		app.use(compression());
		app.use(json({ limit: '50mb' }));
		app.use(urlencoded({ extended: true }));
		app.use('*', cloudinaryConfig);
		cron.schedule('* * * * *', async function () {
			console.log('---------------------');
		//  const ans = await changeStatus();
		//  console.log(ans);
		 console.log('running a task every 60 seconds');

		//  return ans;


		});
	}
	private testMiddlewares(app: Application): void {
		app.get('/test', (req, res) => {
			res.json({
				message: 'Welcome to Mopheth Api'
			});
		});
	}

	private routeMiddlewares(app: Application): void {
		// applicationRoutes(app);
		app.use('/api/v1', userRouter);
	}

	private globalErrorHandler(app: Application): void {
		app.all('*', (req: Request, res: Response) => {
			res.status(HTTP_STATUS.NOT_FOUND).json({
				status: HTTP_STATUS.NOT_FOUND,
				message: `${req.originalUrl} was not found on this server`
			});
		});

		app.use((error: IErrorResponse, _: Request, res: Response, next: NextFunction) => {
			log.error(error);
			if (error instanceof CustomError) {
				return res.status(error.statusCode).json(error.serializedErrors());
			}

			next();
		});
	}

	private async startServer(app: Application): Promise<void> {
		try {
			const httpServer: http.Server = new http.Server(app);

			// start socket.io
			const socketIO: Server = await this.createSocketIO(httpServer);
			this.startHttpServer(httpServer);

			// socket.io connections
			this.socketIOConnection(socketIO);
		} catch (error) {
			log.error(error);
		}
	}

	// private async createSocketIO(httpServer: http.Server): Promise<Server> {
	// 	const io: Server = new Server(httpServer, {
	// 		cors: {
	// 			origin: config.CLIENT_URL,
	// 			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
	// 		}
	// 	});

	// 	const pubClient = createClient({
	// 		// url: `redis://${process.env.SECRET_KEY}@${config.REDIS_HOST}`
	// 		url: 'redis://127.0.0.1:6379'

	// 	});
	// 	// 'redis://127.0.0.1:6379`
	// 	const subClient = pubClient.duplicate();
	// 	await Promise.all([pubClient.connect(), subClient.connect()]);

	// 	log.info(`Redis started on port ${config.REDIS_HOST}`);

	// 	io.adapter(createAdapter(pubClient, subClient));

	// 	return io;
	// }

	private async createSocketIO(httpServer: http.Server): Promise<Server> {
		const io: Server = new Server(httpServer, {
			cors: {
				origin: config.CLIENT_URL,
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
			},
		});
		return io;
	}



	private startHttpServer(httpServer: http.Server): void {
		log.info(`Server has started with process id ${process.pid}`);
		httpServer.listen(SERVER_PORT, () => {
			log.info(`Server started on port ${SERVER_PORT}`);
		});
	}

	private socketIOConnection(io: Server): void {
		log.info('Socket.io connection established',io);
	}
}
