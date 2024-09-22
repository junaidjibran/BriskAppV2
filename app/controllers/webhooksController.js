
// export async function syncWebhooks(admin, session, webhooksToBeRegistered) {

//   return new Promise(async (resolve, reject) => {
//     try{
//       if(!webhooksToBeRegistered.length)
//       resolve('success')

//       // const appUrl = process.env.NODE_ENV === 'development' ? 'https://encourage-endless-beans-martin.trycloudflare.com' : process.env.SHOPIFY_APP_URL
//       const appUrl = process.env.NODE_ENV === 'production' ? process.env.SHOPIFY_APP_URL : 'https://5372-2401-ba80-aa90-c9c0-f103-893b-fcb0-3b52.ngrok-free.app/'
      
//       for (let index = 0; index < webhooksToBeRegistered.length; index++) {
//         const singleWebhook = webhooksToBeRegistered[index];
        
//         const webhook = new admin.rest.resources.Webhook({session: session});
//         webhook.address = appUrl + singleWebhook.address;
//         webhook.topic = singleWebhook.topic;
//         webhook.format = "json";
//         await webhook.save({
//           update: true,
//         });
//       }

//       resolve('success')

//     }
//     catch(error) {
//       console.log('syncWebhooks:faild', error)
//       reject({
//         msg: 'unseccessfull',
//         error
//       })
//     }
//   })
// }

export async function syncWebhooks(admin, session, webhooksToBeRegistered) {

	return new Promise(async (resolve, reject) => {
		try {
			if (!webhooksToBeRegistered.length)
				resolve('success')

			// const appUrl = process.env.NODE_ENV === 'development' ? 'https://encourage-endless-beans-martin.trycloudflare.com' : process.env.SHOPIFY_APP_URL
			const appUrl = process.env.NODE_ENV === 'production' ? process.env.SHOPIFY_APP_URL : 'https://5372-2401-ba80-aa90-c9c0-f103-893b-fcb0-3b52.ngrok-free.app/'

			for (let index = 0; index < webhooksToBeRegistered.length; index++) {
				const singleWebhook = webhooksToBeRegistered[index];

				const webhook = new admin.rest.resources.Webhook({ session: session });
				webhook.address = appUrl + singleWebhook.address;
				webhook.topic = singleWebhook.topic;
				webhook.format = "json";
				await webhook.save({
					update: true,
				});
			}

			resolve('success')

		}
		catch (error) {
			console.log('syncWebhooks:faild', error)
			reject({
				msg: 'unseccessfull',
				error
			})
		}
	})
}