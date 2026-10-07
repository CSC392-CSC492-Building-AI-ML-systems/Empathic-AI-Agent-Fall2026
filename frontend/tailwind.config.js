/** @type {import('tailwindcss').Config} */
module.exports = {
  	"content": [
    		"./src/**/*.{js,jsx,ts,tsx}"
  	],
  	"theme": {
    		"extend": {
      			"colors": {
        				"whitesmoke": {
          					"100": "#f4f6f2",
          					"200": "#ebefea"
        				},
        				"lightgray": "#d1d5db",
        				"gray": "#111827",
        				"slategray": {
          					"100": "#77828f",
          					"200": "#6b7280"
        				},
        				"white": "#fff"
      			},
      			"spacing": {
        				"num-1": "1px solid #77828f"
      			},
      			"fontFamily": {
        				"plus-jakarta-sans": "Plus Jakarta Sans",
        				"inter": "Inter"
      			},
      			"borderRadius": {
        				"num-10": "10px"
      			},
      			"padding": {
        				"num-5": "5px"
      			}
    		},
    		"fontSize": {
      			"num-12": "12px"
    		}
  	},
  	"corePlugins": {
    		"preflight": false
  	}
}