let webpack = require('webpack');
let ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = function () {
    let rules = [];
    let extractPlugins = [];

    // Babel Compilation.
    rules.push({
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        use: [
            {
                loader: 'babel-loader',
                options: Config.babel()
            }
        ]
    });


    // TypeScript Compilation.
    if (Mix.isUsing('typeScript')) {
        rules.push({
            test: /\.tsx?$/,
            loader: 'ts-loader',
            exclude: /node_modules/,
        });

        extensions.push('.ts', '.tsx');
    }


    // CSS Compilation.
    rules.push({
        test: /\.css$/,
        loaders: ['style-loader', 'css-loader']
    });


    // Add support for loading HTML files.
    rules.push({
        test: /\.html$/,
        loaders: ['html-loader']
    });


    // Add support for loading images.
    rules.push({
        test: /\.(png|jpe?g|gif)$/,
        loaders: [
            {
                loader: 'file-loader',
                options: {
                    name: path => {
                        if (! /node_modules|bower_components/.test(path)) {
                            return 'images/[name].[ext]?[hash]';
                        }

                        return 'images/vendor/' + path
                            .replace(/\\/g, '/')
                            .replace(
                                /((.*(node_modules|bower_components))|images|image|img|assets)\//g, ''
                            ) + '?[hash]';
                    },
                    publicPath: Config.resourceRoot
                }
            },

            {
                loader: 'img-loader',
                options: Config.imgLoaderOptions
            }
        ]
    });


    // Add support for loading fonts.
    rules.push({
        test: /\.(woff2?|ttf|eot|svg|otf)$/,
        loader: 'file-loader',
        options: {
            name: path => {
                if (! /node_modules|bower_components/.test(path)) {
                    return 'fonts/[name].[ext]?[hash]';
                }

                return 'fonts/vendor/' + path
                    .replace(/\\/g, '/')
                    .replace(
                        /((.*(node_modules|bower_components))|fonts|font|assets)\//g, ''
                    ) + '?[hash]';
            },
            publicPath: Config.resourceRoot
        }
    });


    // Add support for loading cursor files.
    rules.push({
        test: /\.(cur|ani)$/,
        loader: 'file-loader',
        options: {
            name: '[name].[ext]?[hash]',
            publicPath: Config.resourceRoot
        }
    });


    // Here, we'll filter through all CSS preprocessors that the user has requested.
    // For each one, we'll add a new Webpack rule and then prepare the necessary
    // extract plugin to extract the CSS into its file.
    Object.keys(Config.preprocessors).forEach(type => {
        if (type === 'fastSass') return;

        Config.preprocessors[type].forEach(preprocessor => {
            let outputPath = preprocessor.output.filePath.replace(Config.publicPath + path.sep, path.sep);

            tap(new ExtractTextPlugin(outputPath), extractPlugin => {
                let loaders = [
                    {
                        loader: 'css-loader',
                        options: {
                            url: Config.processCssUrls,
                            sourceMap: Mix.isUsing('sourcemaps'),
                            importLoaders: 1
                        }
                    },

                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: (type === 'sass' && Config.processCssUrls) ? true : Mix.isUsing('sourcemaps'),
                            plugins: [
                                require('autoprefixer')
                            ].concat(Config.postCss)
                        }
                    },
                ];

                if (type === 'sass' && Config.processCssUrls) {
                    loaders.push({
                        loader: 'resolve-url-loader',
                        options: {
                            sourceMap: true,
                            root: Mix.paths.root('node_modules')
                        }
                    });
                }

                loaders.push({
                    loader: `${type}-loader`,
                    options: Object.assign(
                        preprocessor.pluginOptions,
                        { sourceMap: (type === 'sass' && Config.processCssUrls) ? true : Mix.isUsing('sourcemaps') }
                    )
                });

                rules.push({
                    test: preprocessor.src.path(),
                    use: extractPlugin.extract({ use: loaders })
                });

                extractPlugins.push(extractPlugin);
            });
        });
    });


    // Vue Compilation.
    let vueExtractPlugin;

    if (Config.extractVueStyles) {
        vueExtractPlugin = extractPlugins.length ? extractPlugins[0] : new ExtractTextPlugin('vue-styles.css');
    }

    rules.push({
        test: /\.vue$/,
        loader: 'vue-loader',
        exclude: /(node_modules|bower_components)/,
        options: {
            // extractCSS: Config.extractVueStyles,
            loaders: Config.extractVueStyles ? {
                js: {
                    loader: 'babel-loader',
                    options: Config.babel()
                },

                scss: vueExtractPlugin.extract({
                    use: 'css-loader!sass-loader',
                    fallback: 'vue-style-loader'
                }),

                sass: vueExtractPlugin.extract({
                    use: 'css-loader!sass-loader?indentedSyntax',
                    fallback: 'vue-style-loader'
                }),

                css: vueExtractPlugin.extract({
                    use: 'css-loader',
                    fallback: 'vue-style-loader'
                }),

                stylus: vueExtractPlugin.extract({
                    use: 'css-loader!stylus-loader?paths[]=node_modules',
                    fallback: 'vue-style-loader'
                }),

                less: vueExtractPlugin.extract({
                    use: 'css-loader!less-loader',
                    fallback: 'vue-style-loader'
                }),
            } : {
                js: {
                    loader: 'babel-loader',
                    options: Config.babel()
                }
            },
            postcss: Config.postCss,
            preLoaders: Config.vue.preLoaders,
            postLoaders: Config.vue.postLoaders
        }
    });

    // If there were no existing extract text plugins to add our
    // Vue styles extraction too, we'll push a new one in.
    if (Config.extractVueStyles && ! extractPlugins.length) {
        extractPlugins.push(vueExtractPlugin);
    }

    return { rules, extractPlugins };
}
