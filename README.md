# Go-Work-Tracker
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/theBGuy/go-work-tracker/total?style=for-the-badge)

Work Tracker is a time tracking application that allows you to record and total your work time for each day, month, and year, and per organization. It provides a simple and intuitive interface for starting and stopping the timer, changing the organization, and viewing the total work time.

## Features

- **Time Tracking**: Track your work time with a simple start/stop timer.
- **Per Organization Tracking**: Record work time separately for each organization.
- **Daily, Monthly, and Yearly Totals**: View the total work time for each day, month, and year.
- **CSV Export**: Export the work time data to a CSV file for each month and year.
- **In-App Totals**: View the yearly and monthly totals directly within the application.

<!-- ## Development

This is the official Wails React-TS template.

You can configure the project by editing `wails.json`. More information about the project settings can be found
here: https://wails.io/docs/reference/project-config -->

## Development

### Requirements
- `Wails CLI v^2.8.0` [Install Wails](https://wails.io/docs/gettingstarted/installation)
- `Go v^1.18` [Install Go](https://go.dev/doc/install)
- `Node v^15.0.0` [Install Node](https://nodejs.org/en/download/current)

### Live Development

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on http://localhost:34115. Connect
to this in your browser, and you can call your Go code from devtools.

## Building

To build a redistributable, production mode package, use `wails build`.

![main-page](https://github.com/theBGuy/go-work-tracker/assets/60308670/6424d52a-9f0e-424e-abee-fb03126fbc12)
![yearly-table](https://github.com/theBGuy/go-work-tracker/assets/60308670/5150f30b-2161-497e-8218-4b844135e2f4)


## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you would like to contribute.

## License

Work Tracker is licensed under the MIT license. See the [LICENSE](LICENSE) file for more details.
