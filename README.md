# Go-Work-Tracker

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/theBGuy/go-work-tracker/total?style=for-the-badge)

Work Tracker is a time tracking application that allows you to record and total your work time for each day, month, and year, and per organization. It provides a simple and intuitive interface for starting and stopping the timer, changing the organization, and viewing the total work time.

## Features

- **Time Tracking**: Track your work time with a simple start/stop timer.
- **Per Organization/Per Project Tracking**: Record work time separately for each organization.
- **Daily, Monthly, and Yearly Totals**: View the total work time for each day, month, and year.
- **CSV/PDF Exports**: Export the work time data to a CSV or PDF file.
- **In-App Totals**: View the yearly, monthly, and weekly totals directly within the application.

## Development

### Requirements

- `Wails CLI v^2.9.1` [Install Wails](https://wails.io/docs/gettingstarted/installation)
- `Go v^1.22.0` [Install Go](https://go.dev/doc/install)
- `Node v^20.16.0` [Install Node](https://nodejs.org/en/download/current)

### Dependencies

- **React v18**: A JavaScript library for building user interfaces.
- **React Router v6**: A collection of navigational components for React applications.
- **Zustand v4**: A small, fast, and scalable state-management solution.
- **MUI v5**: A popular React UI framework that provides a comprehensive set of components and tools to build consistent, beautiful, and responsive user interfaces.
- **SQLite**: A C-language library that implements a small, fast, self-contained, high-reliability, full-featured, SQL database engine.
- **Wails v2**: A framework for building desktop applications using Go & Web Technologies.
- **Vite v3**: A fast and modern build tool that leverages native ES modules and provides a lightning-fast development server with hot module replacement (HMR).
- **TypeScript v5**: A strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.

### Live Development

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on http://localhost:34115. Connect
to this in your browser, and you can call your Go code from devtools.

## Building

To build a redistributable, production mode package, use `wails build`.

![image](https://github.com/user-attachments/assets/62dcff1f-fa0d-4b08-b493-388dedfe3b99)

![image](https://github.com/user-attachments/assets/37fd7b5b-aa49-4b19-b655-f0a04c4513e9)

![image](https://github.com/user-attachments/assets/76bd87ee-e823-4faf-9e3d-33e2cb5f8910)

![image](https://github.com/user-attachments/assets/c4c30f1c-f16a-4ee7-96c7-a044b43820ab)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you would like to contribute.

## License

Work Tracker is licensed under the MIT license. See the [LICENSE](LICENSE) file for more details.
