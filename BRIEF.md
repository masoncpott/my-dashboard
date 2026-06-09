# Project brief
- I want you to build an executive dashboard.
- the fictional company name is called "FastForward Logistics".

## About the fictional company:
- FastForward Logistics is a mid-size freight and supply chain company. 
- Their ops team is drowning in spreadsheets. 
- The VP of Operations wants a single internal dashboard she can pull up in leadership meetings to see how the business is running: shipment volume, on-time delivery rates, regional performance, and open exceptions. 
- With no in-house dev team, they came to you. 
- Your job is to scope it, plan it, and build a working prototype. 
- The specifics of what goes on the dashboard are yours to define, but make it feel like a real client engagement.

## Next steps:
- Since the shell of the application is already built out, theme the app for our FastFoward Logistics company. 
- pick a modern color sheme that is different from the Vue defaults.
- Replace the metrics that are currently in the app with the ones that FastForward Logistics cares about: shipment volume, on-time delivery rates, regional performance, adn open exceptions.
- make up realistic looking data for these metrics.

## Product requirements:
- add the ability for users to select specific date ranges and the charts will update and display data specific to that range. The date ranges available should be January 1 2024 to today.
- If the user selects a date or date range that is outside of this window, handle this edge case gracefully by providing instructions to the user to select dates within the correct window.
- Users need to also be able to select and filter data by region. It should default to showing data for ALL regions, but if a user selects just one, like the midwest for example, the charts should update to only display data for the midwest within the selected time frame.


## Design:
- clean, minimalist, modern color palette and component design.
- must have both light and dark mode, default to dark mode.
- this application must work on a variety of screen sizes and be mobile friendly.

## Technology requirements:
- vue with typescript
- vuetify component library and material design icon library
- chart.js and vue-chartjs for data visualization