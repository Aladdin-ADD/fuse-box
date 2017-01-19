import { WorkFlowContext } from "./WorkflowContext";
import { ModuleCollection } from "./ModuleCollection";
import { File } from "./File";
export class CollectionSource {
    constructor(public context: WorkFlowContext) { }

    public get(collection: ModuleCollection, withSourceMaps: boolean = false): Promise<string> {

        if (collection.cachedContent) {

            return new Promise((resolve, reject) => {
                this.context.source.addContent(collection.cachedContent);
                return resolve(collection.cachedContent);
            });
        }
        this.context.source.createCollection(collection);
        return this.resolveFiles(collection.dependencies).then(files => {

            this.context.source.startCollection(collection);
            let requiredKeys = Object.keys(collection.requireAst);
            files.forEach(f => {
                for (let p in f.requireAst) {
                    let ast = f.requireAst[p];

                    ast.callee.name = "fusebox_require";
                    let foundIndex = requiredKeys.indexOf(f.info.fuseBoxPath).toString();
                    ast.arguments[0].value = foundIndex;
                    ast.arguments[0].raw = foundIndex;

                }


                f.analysis.regenerateContents();


                this.context.source.addFile(f);
            });
            return this.context.source.endCollection(collection);
        });

    }
    private resolveFiles(files: Map<string, File>): Promise<File[]> {
        let cnt = [];
        let promises: Promise<any>[] = [];
        files.forEach(file => {
            file.resolving.forEach(p => {
                promises.push(p);
            });
        });
        return Promise.all(promises).then(() => {
            let filtered: File[] = [];
            files.forEach(file => {
                if (file.isFuseBoxBundle) {
                    this.context.source.addContentToCurrentCollection(file.contents);
                }
                if (!file.info.isRemoteFile) {
                    filtered.push(file);
                }

            });
            return filtered;
        });
    }
}