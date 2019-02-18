'use strict';
const express = require('express');
const rp = require('request-promise');
const {URL} = require('url');



const getUserKey = ({user:{provider, id}}) => `${provider}-${id}`;

module.exports = es => {

    
    const url = new URL(es.bundles_index);
    url.href = `${url.href}/bundle`;

    const router = express.Router();
    
    router.use((req, res, next) => {
        if (!req.isAuthenticated()) {
            res.status(403).json({
                error : "You must sign in to use this service",
            });
            return;
        }
        next();
    });

    router.get('/list-bundle', async (req, res) => {
 
        try {
            const esReqBody = {
                size: 1000,
                query: {
                    match: {
                        userKey:getUserKey(req),
                    }
                },
            };
            
            const options = {
                url: `${url}/_search`,
                json: true,
                body: esReqBody
            };
    
    
            const esResBody = await rp.get(options);
            const bundles = esResBody.hits.hits.map(hit => ({
                id: hit._id,
                name: hit._source.name,
            }));
            
            res.status(200).json(bundles);
        } catch (err) {
            res.send(err.statusCode || 502).json(err.error || err);
        }

    }) ;


    router.post('/bundle', async (req ,res) => {
        try {
            const bundle = {
                name: req.query.name,
                books: [],
                userKey: getUserKey(req),
            }
            console.log(url);
            const erResBody = await rp.post({url, json: true, body: bundle});
            
            res.status(201).json(erResBody);

                
        } catch (err) {
            res.status(err.statusCode || 502).json(err.error || err);
        }
    });


    router.get('/bundle/:id', async (req, res) => {
        try {

            const options = {
                url: `${url}/${req.params.id}`,
                json: true,
            }

            const {_source: bundle} = await rp.get(options);

            if (bundle.userKey !== getUserKey(req)) {
                throw {
                    statusCode: 403,
                    error: 'You are not authorized to view this bundle',
                };
            }

            res.status(200).json({id: req.params.id, bundle});
        } catch (err) {
            res.status(err.statusCode || 502).json(err.error || err);
        }
    });

    router.delete('/bundle/:id', async (req, res) => {

        try {
            const option = {
                url : `${url}/${req.params.id}`,
                json: true,
            };
            const esResBody = await rp.delete(option);

            res.status(200).json(esResBody);
        } catch (err) {
            res.status(err.statusCode || 502).json(err.error || err);
        }
        
    });
    
    return router;
}