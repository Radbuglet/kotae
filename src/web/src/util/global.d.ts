declare module "*.module.css" {
    const Export: Readonly<{
        readonly [name: string]: string,
    }>;

    export default Export;
}
