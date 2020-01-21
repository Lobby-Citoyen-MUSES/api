.PHONY: up qa build deployment

up: 
	docker run -it --rm -p 8080:8080 -v `pwd`:/var/app -w /var/app node npm run dev

qa:
	docker run -it --rm -p 3000:3000 -v `pwd`:/var/app -w /var/app serverless serverless offline

package:
	docker-compose run serverless package

deployment:
	docker-compose run serverless deploy