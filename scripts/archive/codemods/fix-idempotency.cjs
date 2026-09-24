const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "          // Handle the event\n          logger.info(`Received Stripe event: ${event.type}`);\n\n          if (event.type === 'checkout.session.completed') {",
  "          // Handle the event\n          logger.info(`Received Stripe event: ${event.type}`);\n\n          if (supabase) {\n            // Idempotency check: insert the event. If it fails due to unique constraint, it was already processed.\n            const { error: insertError } = await supabase\n              .from('stripe_events')\n              .insert({ id: event.id, type: event.type });\n            \n            if (insertError && insertError.code === '23505') {\n              logger.info(`Stripe event ${event.id} already processed. Skipping.`);\n              return res.json({received: true});\n            }\n          }\n\n          if (event.type === 'checkout.session.completed') {"
);

fs.writeFileSync('server.ts', content);
